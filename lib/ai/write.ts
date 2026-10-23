import "server-only"
import { z } from "zod"
import { generate, UNTRUSTED_NOTE } from "@/lib/ai/client"
import { recordForPrompt } from "@/lib/ai/record-prompt"
import { BANNED_WORDS, bannedWordsIn, unsupportedNumbers } from "@/lib/record/verify"
import type { Bullet, Fact, Item } from "@/lib/record/types"

// Grouped by item: smaller models keep ids straight far better than with one flat list.
const WriteSchema = z.object({
  headline: z.string(),
  items: z.array(
    z.object({
      item_id: z.string().describe("Exactly the id attribute of an <item>"),
      bullets: z.array(z.object({ text: z.string(), fact_ids: z.array(z.string()).describe("Exactly the id attributes of <fact>s inside this item") })),
    })
  ),
})
export interface WrittenBullet {
  item_id: string
  text: string
  fact_ids: string[]
}

function flatten(out: z.infer<typeof WriteSchema>): WrittenBullet[] {
  return out.items.flatMap((i) => i.bullets.map((b) => ({ item_id: i.item_id, ...b })))
}

const MAX_WORDS = 28
const WEAK_OPENER = /^(worked on|working on|responsible for|helped|assisted|involved in|participated in|tasked with)\b/i

const SYSTEM = `You write resume bullets for a software developer from their Career Record, the way a senior engineer who reviews resumes would. Each <item> and <fact> has an id. Write bullets for every item in the budget list, grouped under that item's exact id, and cite the exact ids of the facts each bullet is built from. Never invent ids.

${UNTRUSTED_NOTE}

How a strong bullet reads: [past-tense verb] [what was built or changed] [with which technologies] [the result or scale, only if a cited fact gives one].
  Weak: "Worked on the backend of the app using various technologies."
  Strong: "Built a FastAPI service with PostgreSQL that handles sign-up and billing for ~200 paying users."

Rules:
- Start with a specific past-tense verb (Built, Shipped, Designed, Cut, Migrated, Automated, Wrote, Added, Replaced…). Never start with "Worked on", "Responsible for", "Helped", "Assisted", "Involved in" or "Participated in".
- Aim for 14-22 words. One idea per bullet. Don't repeat a fact across bullets, and don't restate the item's name.
- Put the strongest, most specific bullet first in each item. Combine small related facts into one bullet rather than writing thin ones.
- Name the concrete technologies from the facts inside the sentence, not as a trailing list.
- Vary the opening verb: no two bullets on the whole resume should start with the same word when you can avoid it.
- Only say what the cited facts say. No number unless a cited fact has that number. Keep ranges and "~" exactly as in the fact (e.g. "100-1k users" stays "100-1k").
- No filler: "various", "multiple features", "etc.", "successfully", "robust", "scalable" (unless a fact shows scale).
- Never use: ${BANNED_WORDS.join(", ")}.
- Bullets marked "keep" were written by the user: don't output new bullets for those items unless asked.
- If a target role is given, lead each item with the facts most relevant to it. Never add skills or claims the facts don't contain.
- headline: a title the person has actually held (from a job item), or "Software Developer". Never invent a title.`

function rangesIn(text: string): string[] {
  return (text.match(/\d[\d,.]*\s*[kKmM]?\s*[-–—]\s*\d[\d,.]*\s*[kKmM+]?/g) ?? []).map((r) => r.replace(/[\s,]/g, "").replace(/[–—]/g, "-").toLowerCase())
}

export function checkBullet(b: WrittenBullet, itemFacts: Map<string, Fact>): string[] {
  const errors: string[] = []
  const cited = b.fact_ids.map((id) => itemFacts.get(id))
  if (!b.fact_ids.length) errors.push(`"${b.text}" cites no facts`)
  if (cited.some((f) => !f)) errors.push(`"${b.text}" cites fact ids that don't belong to item ${b.item_id}`)
  const texts = cited.filter((f): f is Fact => !!f).map((f) => f.text)
  const nums = unsupportedNumbers(b.text, texts)
  if (nums.length) errors.push(`"${b.text}" has numbers not in its facts: ${nums.join(", ")}`)
  const bulletRanges = rangesIn(b.text)
  for (const f of cited) {
    if (!f?.approx) continue
    for (const r of rangesIn(f.text)) if (!bulletRanges.includes(r)) errors.push(`"${b.text}" must keep the range "${r}" as a range`)
  }
  const banned = bannedWordsIn(b.text)
  if (banned.length) errors.push(`"${b.text}" uses banned words: ${banned.join(", ")}`)
  if (b.text.split(/\s+/).length > MAX_WORDS) errors.push(`"${b.text}" is longer than ${MAX_WORDS} words`)
  if (WEAK_OPENER.test(b.text.trim())) errors.push(`"${b.text}" starts with a weak opener; start with what was built or changed`)
  return errors
}

export async function writeBullets(opts: {
  userId: string
  items: Item[]
  facts: Fact[]
  keep?: Bullet[]
  budget?: Map<string, number> // max bullets per item
  targetRole?: string
  // A one-off direction from the user, e.g. "shorter" or "lead with impact".
  instruction?: string
}): Promise<{ headline: string; bullets: WrittenBullet[]; fallbacks: number }> {
  // A shared README describes the project, not this person's contribution.
  // Show its metadata in the partial draft, but wait for their answer to write
  // personal bullets. A prompt alone cannot enforce ownership.
  const items = opts.items.filter((i) => (i.type === "job" || i.type === "project" || i.type === "award") && (!i.data.team_project || i.data.ownership_confirmed) && opts.facts.some((f) => f.item_id === i.id))
  if (!items.length) return { headline: "Software Developer", bullets: [], fallbacks: 0 }

  const teamIds = new Set(items.filter((i) => i.data.team_project).map((i) => i.id))
  const writingFacts = opts.facts.filter((f) => !teamIds.has(f.item_id) || f.label === "user")
  const factsByItem = new Map<string, Map<string, Fact>>()
  for (const f of writingFacts) {
    if (!factsByItem.has(f.item_id)) factsByItem.set(f.item_id, new Map())
    factsByItem.get(f.item_id)!.set(f.id, f)
  }
  const ids = new Set(items.map((i) => i.id))
  const budgetText = items.map((i) => `${i.id}: up to ${opts.budget?.get(i.id) ?? (i.type === "job" ? 4 : 3)} bullets`).join("\n")

  const check = (out: z.infer<typeof WriteSchema>) =>
    [
      ...items.filter((i) => !out.items.some((o) => o.item_id === i.id)).map((i) => `No bullets for item ${i.id}; write bullets for every item in the budget list`),
      ...flatten(out).flatMap((b) => (ids.has(b.item_id) ? checkBullet(b, factsByItem.get(b.item_id) ?? new Map()) : [`Unknown item_id ${b.item_id}`])),
    ]

  const out = await generate({
    step: "write",
    userId: opts.userId,
    schema: WriteSchema,
    effort: "high",
    maxTokens: 32000,
    system: SYSTEM,
    content: [
      { type: "text", text: recordForPrompt(items, writingFacts, opts.keep ?? []) },
      {
        type: "text",
        text: `Bullet budget per item:\n${budgetText}${opts.targetRole ? `\n\nTarget role: ${opts.targetRole}` : ""}${opts.instruction ? `\n\nThe user asked for this rewrite: ${opts.instruction}` : ""}`,
      },
    ],
    check,
    acceptOnLastAttempt: true,
  })

  // Anything still failing falls back to the plain fact text, which is true by construction.
  let fallbacks = 0
  const bullets = flatten(out)
    .filter((b) => ids.has(b.item_id))
    .map((b) => {
      const facts = factsByItem.get(b.item_id) ?? new Map<string, Fact>()
      if (!checkBullet(b, facts).length) return b
      fallbacks++
      const first = b.fact_ids.map((id) => facts.get(id)).find(Boolean) ?? [...facts.values()][0]
      return first ? { item_id: b.item_id, text: first.text, fact_ids: [first.id] } : null
    })
    .filter((b): b is WrittenBullet => b != null)

  // The last model attempt may omit an item altogether. Preserve a truthful
  // draft for it rather than silently dropping all of its evidence.
  for (const item of items) {
    if (bullets.some((b) => b.item_id === item.id)) continue
    const first = factsByItem.get(item.id)?.values().next().value
    if (first) {
      bullets.push({ item_id: item.id, text: first.text, fact_ids: [first.id] })
      fallbacks++
    }
  }

  const jobTitles = opts.items.filter((i) => i.type === "job").map((i) => i.data.role?.toLowerCase())
  const headline = jobTitles.includes(out.headline.toLowerCase()) ? out.headline : "Software Developer"
  return { headline, bullets, fallbacks }
}

import "server-only"
import { z } from "zod"
import { generate, UNTRUSTED_NOTE } from "@/lib/ai/client"
import { recordForPrompt } from "@/lib/ai/record-prompt"
import { BANNED_WORDS, bannedWordsIn, unsupportedNumbers } from "@/lib/record/verify"
import type { Bullet, Fact, Item } from "@/lib/record/types"
import { headingOf } from "@/lib/resume/build"
import { thinLine } from "@/lib/resume/thin"

// Grouped by item: smaller models keep ids straight far better than with one flat list.
export const WriteSchema = z.object({
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

const MAX_WORDS = 30
const REPO_STATS = /\b\d+\s+commits?\b|\bsolo repo\b/i
const WEAK_OPENER = /^(worked on|working on|responsible for|helped|assisted|involved in|participated in|tasked with|utilized)\b/i

const SYSTEM = `You write resume bullets for a software developer from their Career Record, the way a senior engineer who hires would want to read them. Each <item> and <fact> has an id. Write bullets for every item in the budget list, grouped under that item's exact id, and cite the exact ids of the facts each bullet is built from. Never invent ids.

${UNTRUSTED_NOTE}

Where the good material is:
- Facts labelled "user" are the person's own answers ("What did you build in X: auth, payments", "How many people used X: 100-1k"). They say what THIS person did and what changed. Build the first bullet of an item on them whenever they exist.
- Facts labelled "github" or "document" say what the project is and what it uses. Use them for the concrete technologies and scope, not as the whole bullet.

A strong bullet: [specific past-tense verb] [the thing they built or changed] [with which technologies] [the result or scale, only if a cited fact gives one].
  Weak (restates the README): "A web app that lets users track their expenses, built with React and Firebase."
  Strong: "Built expense tracking with React and Firebase Auth, adding receipt photo upload and monthly budget alerts."
  Weak: "Worked on the backend of the app using various technologies."
  Strong: "Designed a FastAPI and PostgreSQL billing service that handles sign-up and payments for 100-1k users."
  With an answer "Hardest problem you solved in X: race conditions when two users edit the same doc": "Fixed conflicting edits between simultaneous users by adding version checks to the Socket.IO sync layer."

Rules:
- Start with a specific past-tense verb (Built, Shipped, Designed, Cut, Migrated, Automated, Wrote, Added, Replaced, Fixed…). Never "Worked on", "Responsible for", "Helped", "Assisted", "Involved in", "Participated in", "Utilized".
- 12-24 words. One idea per bullet. Don't repeat a fact across bullets and don't restate the item's name.
- Never repeat what the entry's heading already prints: its role, company, project name, school or dates ("Freelance Web Developer from Aug 2024 to Present" is not a bullet).
- Repository stats are not accomplishments: no commit counts, "solo repo", or file names like "Dockerfile" and "README" as the point of a bullet. Say what the person built or changed.
- Strongest, most specific bullet first. Merge thin related facts into one bullet rather than writing two weak ones. Fewer strong bullets beat the full budget of weak ones.
- Technologies go inside the sentence, not as a trailing list.
- Vary the opening verb across the whole resume.
- Only say what the cited facts say. No number unless a cited fact has that number. Keep ranges and "~" exactly as in the fact ("100-1k users" stays "100-1k").
- On team work, claim only the parts the user's answers say were theirs.
- No filler: "various", "multiple features", "etc.", "successfully", "robust", "scalable" (unless a fact shows scale), "seamless", "user-friendly".
- Never use: ${BANNED_WORDS.join(", ")}.
- Bullets marked "keep" were written by the user: don't output new bullets for those items unless asked.
- If a target role or <job_post> is given, lead each item with the facts that show what it asks for, and use the post's name for a skill when a cited fact names that same skill ("PostgreSQL" for a fact that says "Postgres"). Never add a skill, tool or claim from the post that the facts don't contain.
- headline: a title the person has actually held (from a job item), or "Software Developer". Never invent a title.`

const REPAIR_NOTE = "Some bullets you wrote failed the checks below. Rewrite only those items: output each listed item with its full set of bullets. Fix every problem named; keep what was good."

function rangesIn(text: string): string[] {
  return (text.match(/\d[\d,.]*\s*[kKmM]?\s*[-–—]\s*\d[\d,.]*\s*[kKmM+]?/g) ?? []).map((r) => r.replace(/[\s,]/g, "").replace(/[–—]/g, "-").toLowerCase())
}

// `heading`: what the entry's heading prints, so a line that only repeats it is caught in code.
export function checkBullet(b: WrittenBullet, itemFacts: Map<string, Fact>, heading?: { title: string; subtitle: string; dates: string }): string[] {
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
  if (REPO_STATS.test(b.text)) errors.push(`"${b.text}" leans on repository stats; say what was built or changed instead`)
  if (WEAK_OPENER.test(b.text.trim())) errors.push(`"${b.text}" starts with a weak opener; start with what was built or changed`)
  if (heading && thinLine(b.text, heading)) errors.push(`"${b.text}" only repeats the entry's heading, gives a link or counts commits; say what was built or changed`)
  return errors
}

export async function writeBullets(opts: {
  userId: string
  items: Item[]
  facts: Fact[]
  keep?: Bullet[]
  budget?: Map<string, number> // max bullets per item
  targetRole?: string
  // The job post a tailored resume is for. Untrusted text, used only to choose emphasis.
  jobPost?: string
  // A one-off direction from the user, e.g. "shorter" or "lead with impact".
  instruction?: string
  // "fix" marks a rewrite the user asked for; it counts toward the plan's monthly AI fixes.
  purpose?: "fix"
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
  const headings = new Map(items.map((i) => [i.id, headingOf(i)]))
  const checked = (b: WrittenBullet) => checkBullet(b, factsByItem.get(b.item_id) ?? new Map(), headings.get(b.item_id))

  const check = (out: z.infer<typeof WriteSchema>) =>
    [
      ...items.filter((i) => !out.items.some((o) => o.item_id === i.id)).map((i) => `No bullets for item ${i.id}; write bullets for every item in the budget list`),
      ...flatten(out).flatMap((b) => (ids.has(b.item_id) ? checked(b) : [`Unknown item_id ${b.item_id}`])),
    ]

  const prompt = (budgetItems: Item[]) => [
    { type: "text" as const, text: recordForPrompt(budgetItems, writingFacts, opts.keep ?? []) },
    {
      type: "text" as const,
      text: `Bullet budget per item:\n${budgetItems.map((i) => `${i.id}: up to ${opts.budget?.get(i.id) ?? (i.type === "job" ? 4 : 3)} bullets`).join("\n")}${opts.targetRole ? `\n\nTarget role: ${opts.targetRole}` : ""}${opts.jobPost ? `\n\n<job_post>\n${opts.jobPost.slice(0, 12000)}\n</job_post>` : ""}${opts.instruction ? `\n\nThe user asked for this rewrite: ${opts.instruction}` : ""}`,
    },
  ]

  // One full draft, then one small call that rewrites only the items with failing lines.
  const out = await generate({ step: "write", userId: opts.userId, schema: WriteSchema, effort: "high", maxTokens: 32000, system: SYSTEM, content: prompt(items), check, attempts: 1, acceptOnLastAttempt: true, logMeta: () => (opts.purpose ? { purpose: opts.purpose } : {}) })
  const passing = (b: WrittenBullet) => ids.has(b.item_id) && !checked(b).length
  let drafted = flatten(out).filter((b) => ids.has(b.item_id))
  const broken = items.filter((i) => !drafted.some((b) => b.item_id === i.id) || drafted.some((b) => b.item_id === i.id && !passing(b)))
  let headline = out.headline
  if (broken.length) {
    const brokenIds = new Set(broken.map((i) => i.id))
    const problems = check(out).filter((e) => broken.some((i) => e.includes(i.id)) || drafted.some((b) => brokenIds.has(b.item_id) && e.includes(b.text)))
    try {
      const repaired = await generate({
        step: "write",
        userId: opts.userId,
        schema: WriteSchema,
        effort: "high",
        maxTokens: 16000,
        system: SYSTEM,
        content: [...prompt(broken), { type: "text", text: `${REPAIR_NOTE}\n- ${problems.join("\n- ")}` }],
        check: (r) => flatten(r).filter((b) => brokenIds.has(b.item_id)).flatMap(checked),
        attempts: 1,
        acceptOnLastAttempt: true,
      })
      // Keep the better version of each broken item: whichever has more passing lines.
      for (const id of brokenIds) {
        const before = drafted.filter((b) => b.item_id === id)
        const after = flatten(repaired).filter((b) => b.item_id === id)
        if (after.filter(passing).length >= before.filter(passing).length && after.length) drafted = [...drafted.filter((b) => b.item_id !== id), ...after]
      }
      headline ||= repaired.headline
    } catch {
      // The repair is best effort; the fallbacks below keep a truthful draft.
    }
  }

  // Failing lines are dropped. Only an item left with no line at all falls back to its strongest
  // fact's plain text, which is true by construction, unless that fact too only repeats the heading
  // or gives a link: then the item has no line, and the checks say so.
  let fallbacks = 0
  const bullets = drafted.filter(passing)
  for (const item of items) {
    if (bullets.some((b) => b.item_id === item.id)) continue
    const facts = [...(factsByItem.get(item.id)?.values() ?? [])]
    const usable = facts.filter((f) => !thinLine(f.text, headings.get(item.id)!))
    const first = usable.find((f) => f.label === "user") ?? usable[0]
    if (first) {
      bullets.push({ item_id: item.id, text: first.text, fact_ids: [first.id] })
      fallbacks++
    }
  }

  const jobTitles = opts.items.filter((i) => i.type === "job").map((i) => i.data.role?.toLowerCase())
  headline = jobTitles.includes(headline.toLowerCase()) ? headline : "Software Developer"
  return { headline, bullets, fallbacks }
}

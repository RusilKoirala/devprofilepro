import "server-only"
import { z } from "zod"
import { generate, UNTRUSTED_NOTE } from "@/lib/ai/client"
import { recordForPrompt } from "@/lib/ai/record-prompt"
import type { Bullet, Fact, Item } from "@/lib/record/types"

// A4, first version: choose and order existing Career Record items for a request or job post.
// It never writes new wording. Bullets belong to items and are shared by every resume, so
// rewording them here would silently change the base resume too.
const SECTION_TYPES = ["job", "project", "education", "skills", "award"] as const

export const TailorSchema = z.object({
  title: z.string().describe("Short name for this resume, e.g. 'Stripe — Backend Intern' or 'Frontend roles'"),
  company: z.string().nullable().describe("Company named in the request, if any"),
  role: z.string().nullable().describe("Role the resume is aimed at, if any"),
  items: z.array(z.object({ item_id: z.string(), reason: z.string().describe("Why it's relevant, in a few words") })).describe("Items to include, most relevant first"),
  section_order: z.array(z.enum(SECTION_TYPES)),
  requirements: z
    .array(z.object({ text: z.string(), status: z.enum(["covered", "not_found", "unclear"]), item_ids: z.array(z.string()) }))
    .describe("Key requirements of a job post (max 10). Empty if the request isn't a job post."),
  summary: z.string().describe("One or two plain sentences to the user on what you chose and why"),
})
export type TailorPlan = z.infer<typeof TailorSchema>

const SYSTEM = `You help a developer make a version of their resume for a specific request: a pasted job post, a kind of role, or an emphasis they want. You only choose and order items from their Career Record; you never write new claims.

${UNTRUSTED_NOTE}

Rules:
- Use only the <item> ids given. Include the items most relevant to the request, most relevant first. Hidden items may be included when they fit the request better than shown ones.
- A one-page resume usually has 1-4 jobs, 2-4 projects, education, and the relevant skill groups. Always keep education and at least one skills item when they exist.
- section_order: lead with what proves the most for this request. Students and interns usually lead with Education.
- requirements: for a job post, list its key requirements. "covered" only when an item's facts clearly show it (cite those item ids). "not_found" when nothing in the record shows it: that's not proof they lack it, just that it isn't recorded. "unclear" when it's partly shown.
- Never claim a skill, title or number that the facts don't contain. Don't keyword-stuff.
- title: short, e.g. "Stripe — Backend Intern" for a job post, or "Frontend roles" for a direction.`

export async function planTailoredResume(userId: string, brief: string, items: Item[], facts: Fact[], bullets: Bullet[]): Promise<TailorPlan> {
  const usable = items.filter((i) => i.type !== "contact")
  const ids = new Set(usable.map((i) => i.id))
  const plan = await generate({
    step: "tailor",
    userId,
    schema: TailorSchema,
    effort: "medium",
    maxTokens: 16000,
    system: SYSTEM,
    content: [
      { type: "text", text: recordForPrompt(usable, facts, bullets), cache: true },
      { type: "text", text: `<request>\n${brief}\n</request>` },
    ],
    check: (out) => [
      ...out.items.filter((i) => !ids.has(i.item_id)).map((i) => `Unknown item_id ${i.item_id}`),
      ...out.requirements.flatMap((r) => r.item_ids.filter((id) => !ids.has(id)).map((id) => `Requirement "${r.text}" cites unknown item_id ${id}`)),
      ...(out.items.length ? [] : ["Include at least one item"]),
    ],
    acceptOnLastAttempt: true,
  })
  // Whatever still fails the check is dropped rather than trusted.
  const seen = new Set<string>()
  return {
    ...plan,
    items: plan.items.filter((i) => ids.has(i.item_id) && !seen.has(i.item_id) && seen.add(i.item_id)),
    requirements: plan.requirements.slice(0, 10).map((r) => ({ ...r, item_ids: r.item_ids.filter((id) => ids.has(id)) })),
  }
}

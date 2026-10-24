import "server-only"
import { z } from "zod"
import { generate, UNTRUSTED_NOTE } from "@/lib/ai/client"
import { recordForPrompt } from "@/lib/ai/record-prompt"
import type { Bullet, Fact, Item } from "@/lib/record/types"
import { checkTailorPlan, repairTailorPlan } from "@/lib/ai/tailor-check"

// A4, first version: choose and order existing Career Record items for a request or job post.
// It never writes new wording; a tailored resume's own wording comes from its editor and chat.
const SECTION_TYPES = ["job", "project", "education", "skills", "award"] as const

const RequirementStatus = z.enum(["covered", "unclear", "elsewhere", "not_found"])

// What the model returns. Every reason and every covered requirement cites fact ids, so code can
// check that the evidence really belongs to the item it is said to explain.
const ModelSchema = z.object({
  title: z.string().describe("Short name for this resume, e.g. 'Stripe — Backend Intern' or 'Frontend roles'"),
  company: z.string().nullable().describe("Company named in the request, if any"),
  role: z.string().nullable().describe("Role the resume is aimed at, if any"),
  items: z
    .array(z.object({ item_id: z.string(), reason: z.string().describe("Why it's relevant, in a few words, using only this item's facts"), fact_ids: z.array(z.string()).describe("Ids of this item's own facts that show it") }))
    .describe("Items to include, most relevant first"),
  section_order: z.array(z.enum(SECTION_TYPES)),
  requirements: z
    .array(z.object({ text: z.string(), status: RequirementStatus, fact_ids: z.array(z.string()).describe("Facts that show it, from anywhere in the record; empty for not_found") }))
    .describe("Key requirements (max 10). Empty if the request names none."),
  summary: z.string().describe("One or two plain sentences to the user on what you chose and why. Name only items you included."),
})
export type ModelPlan = z.infer<typeof ModelSchema>

// The plan the app keeps: the model's choices after code checks, with item ids derived from the cited facts.
export const TailorSchema = z.object({
  title: z.string(),
  company: z.string().nullable(),
  role: z.string().nullable(),
  items: z.array(z.object({ item_id: z.string(), reason: z.string(), fact_ids: z.array(z.string()).default([]) })),
  section_order: z.array(z.enum(SECTION_TYPES)),
  requirements: z.array(z.object({ text: z.string(), status: RequirementStatus, item_ids: z.array(z.string()), fact_ids: z.array(z.string()).default([]) })),
  summary: z.string(),
})
export type RequirementStatus = z.infer<typeof RequirementStatus>
export type TailorPlan = z.infer<typeof TailorSchema>

const SYSTEM = `You help a developer make a version of their resume for a specific request: a pasted job post, a kind of role, or an emphasis they want. You only choose and order items from their Career Record; you never write new claims.

${UNTRUSTED_NOTE}

Rules:
- Use only the <item> ids given. Include the items most relevant to the request, most relevant first. Hidden items may be included when they fit the request better than shown ones.
- A one-page resume usually has 1-4 jobs, 2-4 projects, education, and the relevant skill groups. Always keep education and at least one skills item when they exist.
- Each item's reason must describe that item only, from its own <fact>s, and fact_ids must be ids of facts inside that same <item>. Never describe one item with another item's facts.
- section_order: lead with what proves the most for this request. Students and interns usually lead with Education.
- requirements: list the key requirements of a job post, or of the skills a request names (max 10). Search the WHOLE record for each one before deciding, including items you didn't pick:
  - "covered": facts of items you included clearly show it. Cite them.
  - "unclear": they show part of it (one half of "Go and Kubernetes", a Dockerfile for "containers in production"). Cite what partly shows it.
  - "elsewhere": only facts of items you did NOT include show it. Cite them. Better still, include the item if it fits.
  - "not_found": no fact anywhere shows it. That isn't proof they lack it, just that it isn't recorded.
  Split a compound requirement ("Go and Node.js APIs") into one per skill when the record shows them differently.
- summary: name only items you included.
- Never claim a skill, title or number that the facts don't contain: a cited fact must name the skill itself, not something near it. Don't keyword-stuff.
- Reasons describe what the item shows, never its status (don't say "hidden").
- title: short, e.g. "Stripe — Backend Intern" for a job post, or "Frontend roles" for a direction.`

export async function planTailoredResume(userId: string, brief: string, items: Item[], facts: Fact[], bullets: Bullet[]): Promise<TailorPlan> {
  const usable = items.filter((i) => i.type !== "contact")
  // Whatever still fails the check is repaired or dropped rather than trusted.
  return repairTailorPlan(await draftTailorPlan(userId, brief, usable, facts, bullets), usable, facts)
}

// The model's plan after its one retry, before code repairs it. Evals score this directly.
export async function draftTailorPlan(userId: string, brief: string, usable: Item[], facts: Fact[], bullets: Bullet[]): Promise<ModelPlan> {
  return generate({
    step: "tailor",
    userId,
    schema: ModelSchema,
    effort: "medium",
    maxTokens: 16000,
    system: SYSTEM,
    content: [
      { type: "text", text: recordForPrompt(usable, facts, bullets), cache: true },
      { type: "text", text: `<request>\n${brief}\n</request>` },
    ],
    check: (out) => checkTailorPlan(out, usable, facts),
    acceptOnLastAttempt: true,
  })
}

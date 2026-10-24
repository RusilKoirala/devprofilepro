import type { TemplateId } from "@/lib/resume/templates"
import { z } from "zod"

export const ITEM_TYPES = ["contact", "job", "project", "education", "skills", "award"] as const
export type ItemType = (typeof ITEM_TYPES)[number]
export type FactLabel = "github" | "document" | "user"

// One flat shape for every item type so structured output stays simple. Unused fields are null.
export const ItemDataSchema = z.object({
  // job
  company: z.string().nullable(),
  role: z.string().nullable(),
  // project / award
  name: z.string().nullable(),
  url: z.string().nullable(),
  tech: z.array(z.string()).nullable(),
  // education
  school: z.string().nullable(),
  degree: z.string().nullable(),
  details: z.string().nullable(),
  // skills
  category: z.string().nullable(),
  skills: z.array(z.string()).nullable(),
  // contact
  email: z.string().nullable(),
  phone: z.string().nullable(),
  website: z.string().nullable(),
  github: z.string().nullable(),
  linkedin: z.string().nullable(),
  // shared
  location: z.string().nullable(),
  start: z.string().nullable().describe("Exactly as written in the source, e.g. 'Jun 2024'"),
  end: z.string().nullable().describe("Exactly as written, e.g. 'Present'"),
})
export type ItemData = Partial<z.infer<typeof ItemDataSchema>> & {
  team_project?: boolean
  ownership_confirmed?: boolean
  // Entries the person said are not duplicates of this one (lib/record/entry-dupes.ts).
  distinct_from?: string[]
  // Lines of this entry that lost one of the sources they cited (lib/record/data-actions.ts), so
  // part of what they say may no longer be backed. Cleared when the line is edited or confirmed.
  review_lines?: string[]
}

export interface Item {
  id: string
  type: ItemType
  data: ItemData
  rank: number
  status: "suggested" | "shown" | "hidden"
  reason: string | null
  pinned: boolean
}

export interface Fact {
  id: string
  item_id: string
  text: string
  label: FactLabel
  source_id: string | null
  quote: string | null
  approx: boolean
}

export interface Bullet {
  id: string
  item_id: string
  text: string
  fact_ids: string[]
  user_edited: boolean
  // Null: the Career Record's shared wording. Set: this tailored resume's own line, standing in
  // for the shared bullet `replaces` (or an extra line when that is null).
  resume_id?: string | null
  replaces?: string | null
}

export interface Question {
  id: string
  item_id: string
  prompt: string
  kind: string | null
  options: string[]
  answer: string | null
  status: "open" | "answered" | "skipped"
}

export interface SourceRow {
  id: string
  kind: string
  label: string
  raw_text: string
  url: string | null
  meta: Record<string, unknown>
  status: string
  fetched_at: string
}

export interface ResumeLayout {
  headline: string
  // Optional "what are you applying for", steers which facts the writer leads with.
  target_role?: string
  section_order: ItemType[]
  // Which design the page is printed in (lib/resume/templates.ts). Unset means Classic.
  template?: TemplateId
  // Body text size the fitter chose: the largest from 11.5pt down to 10pt that fits one page.
  font_size?: number
  // Item ids in the order the user dragged them. Unset means the default order.
  item_order?: string[]
  // Tailored resumes only: the items chosen for this resume. The base resume shows every shown item.
  include?: string[]
  // Tailored resumes only: shared lines removed from this resume, and items it has rewritten in its
  // own words (their shared lines are ignored here).
  hidden_bullets?: string[]
  own_items?: string[]
  items: { item_id: string; bullet_ids: string[] }[]
}

export interface CutEntry {
  item_id: string
  bullet_id?: string
  reason: string
}

export interface ResumeRow {
  id: string
  kind: "base" | "tailored"
  job_id: string | null
  title: string
  layout: ResumeLayout
  cut_log: CutEntry[]
  updated_at: string
  archived_at?: string | null
}

export function itemTitle(item: Pick<Item, "type" | "data">): string {
  const d = item.data
  switch (item.type) {
    case "job":
      return [d.role, d.company].filter(Boolean).join(", ") || "Job"
    case "project":
      return d.name || "Project"
    case "education":
      return d.school || "Education"
    case "skills":
      return d.category || "Skills"
    case "award":
      return d.name || "Award"
    case "contact":
      return "Contact"
  }
}

// Two extracted items are the same thing if these keys match.
export function dedupeKey(item: Pick<Item, "type" | "data">): string {
  const d = item.data
  const norm = (s?: string | null) => (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "")
  switch (item.type) {
    case "job":
      return `job:${norm(d.company)}:${norm(d.role)}:${norm(d.start)}`
    case "project":
      return `project:${norm(d.url) || norm(d.name)}`
    case "education":
      return `education:${norm(d.school)}:${norm(d.degree)}`
    case "skills":
      return `skills:${norm(d.category)}`
    case "award":
      return `award:${norm(d.name)}`
    case "contact":
      return "contact"
  }
}

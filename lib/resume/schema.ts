import type { ItemType } from "@/lib/record/types"
import type { TemplateId } from "@/lib/resume/templates"

// The render shape: what the PDF template, the .tex export and the parser view all read.
// Built in plain code from a resume layout + the Career Record (lib/resume/build.ts).
export interface ResumeEntry {
  item_id: string
  title: string
  subtitle: string
  location: string
  dates: string
  url: string
  tech: string[]
  bullets: { id: string; text: string }[]
}

export interface ResumeSection {
  type: Exclude<ItemType, "contact">
  title: string
  entries: ResumeEntry[]
}

export interface ResumeDoc {
  template: TemplateId
  // Body text size in pt; unset means 10.
  size?: number
  name: string
  headline: string
  contact: {
    email: string
    phone: string
    location: string
    website: string
    github: string
    linkedin: string
  }
  sections: ResumeSection[]
}

export const SECTION_TITLES: Record<ResumeSection["type"], string> = {
  job: "Experience",
  project: "Projects",
  education: "Education",
  skills: "Skills",
  award: "Awards",
}

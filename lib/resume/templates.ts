// The designs a resume can be printed in. Same content, same one-page fit; only the look changes.
// Every design keeps body text at 10pt or larger, uses a plain sans-serif (Helvetica, Arial's
// metric twin), and prints bullets, never paragraphs.
export const TEMPLATES = [
  { id: "compact", name: "Compact", blurb: "Left-aligned and tight. Fits the most lines on one page." },
  { id: "sidebar", name: "Two column", blurb: "Skills and education in a side column. Best when you have lots of skills." },
  { id: "classic", name: "Classic", blurb: "Centered name, ruled headings. The safe pick for any job." },
  { id: "modern", name: "Modern", blurb: "Navy accents and bold company lines. Stands out, still parses cleanly." },
] as const

export type TemplateId = (typeof TEMPLATES)[number]["id"]
export const TEMPLATE_IDS = TEMPLATES.map((t) => t.id) as [TemplateId, ...TemplateId[]]
export const DEFAULT_TEMPLATE: TemplateId = "compact"

export function templateOf(id: string | undefined | null): TemplateId {
  return TEMPLATE_IDS.includes(id as TemplateId) ? (id as TemplateId) : DEFAULT_TEMPLATE
}

// The two-column design's side column. Everything else goes in the main column.
export const SIDEBAR_SECTIONS = new Set(["skills", "education", "award"])

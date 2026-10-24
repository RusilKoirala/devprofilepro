import type { CareerRecord } from "@/lib/record/db"
import type { Item, ResumeLayout } from "@/lib/record/types"
import { templateOf } from "@/lib/resume/templates"
import { SECTION_TITLES, type ResumeDoc, type ResumeEntry, type ResumeSection } from "@/lib/resume/schema"

function dates(start?: string | null, end?: string | null) {
  if (start && end) return `${start} – ${end}`
  return start || end || ""
}

function entryFor(item: Item, bullets: ResumeEntry["bullets"]): ResumeEntry {
  const d = item.data
  const base = { item_id: item.id, location: d.location ?? "", dates: dates(d.start, d.end), url: d.url ?? "", tech: d.tech ?? [], bullets }
  switch (item.type) {
    case "job":
      return { ...base, title: d.role ?? "", subtitle: d.company ?? "" }
    case "education": {
      // Extracted education often repeats itself: the date inside the details ("Expected
      // Graduation: 2027") or the details inside the degree. Print each once.
      const degree = d.degree ?? ""
      const details = d.details && !degree.toLowerCase().includes(d.details.toLowerCase()) ? d.details : ""
      const subtitle = [degree, details].filter(Boolean).join(", ")
      const unsaid = (x?: string | null) => (x && !subtitle.toLowerCase().includes(x.toLowerCase()) ? x : null)
      return { ...base, title: d.school ?? "", subtitle, dates: dates(unsaid(d.start), unsaid(d.end)) }
    }
    case "skills":
      return { ...base, title: d.category ?? "Skills", subtitle: (d.skills ?? []).join(", ") }
    default:
      return { ...base, title: d.name ?? "", subtitle: "" }
  }
}

// layout + record → ResumeDoc. Names, titles and dates always come from the record, never from AI wording.
export function buildResume(layout: ResumeLayout, record: Pick<CareerRecord, "items" | "bullets">): ResumeDoc {
  const items = new Map(record.items.map((i) => [i.id, i]))
  const bullets = new Map(record.bullets.map((b) => [b.id, b]))
  const contact = record.items.find((i) => i.type === "contact")?.data ?? {}

  const sections: ResumeSection[] = []
  for (const type of layout.section_order) {
    if (type === "contact") continue
    const entries = layout.items
      .map((li) => ({ item: items.get(li.item_id), li }))
      .filter((x): x is { item: Item; li: typeof x.li } => x.item?.type === type)
      .map(({ item, li }) =>
        entryFor(
          item,
          li.bullet_ids.map((id) => bullets.get(id)).filter((b) => b != null).filter((b) => b.item_id === item.id).map((b) => ({ id: b.id, text: b.text }))
        )
      )
    if (entries.length) sections.push({ type, title: SECTION_TITLES[type], entries })
  }

  return {
    template: templateOf(layout.template),
    size: layout.font_size,
    name: contact.name ?? "",
    headline: layout.headline,
    contact: {
      email: contact.email ?? "",
      phone: contact.phone ?? "",
      location: contact.location ?? "",
      website: contact.website ?? "",
      github: contact.github ?? "",
      linkedin: contact.linkedin ?? "",
    },
    sections,
  }
}

export function displayUrl(url: string) {
  return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")
}

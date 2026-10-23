import { displayUrl } from "@/lib/resume/build"
import type { ResumeDoc } from "@/lib/resume/schema"

// A miniature of the first page, drawn in HTML from the same ResumeDoc the PDF template uses.
// Laid out at letter width (612px = 8.5in at 72dpi) and scaled down, so it looks like the real page
// without rendering a PDF per card.
const PAGE_WIDTH = 612

export function ResumeThumbnail({ doc, width = 184 }: { doc: ResumeDoc; width?: number }) {
  const scale = width / PAGE_WIDTH
  const contact = [doc.contact.phone, doc.contact.email, doc.contact.location, ...[doc.contact.linkedin, doc.contact.github, doc.contact.website].filter(Boolean).map(displayUrl)].filter(Boolean)
  return (
    <div aria-hidden className="relative overflow-hidden bg-white" style={{ width, height: width * (11 / 8.5) }}>
      <div className="absolute top-0 left-0 origin-top-left px-10 py-8 font-[Helvetica,Arial,sans-serif] text-[10px] leading-[1.3] text-[#111]" style={{ width: PAGE_WIDTH, transform: `scale(${scale})` }}>
        <div className="text-center text-[22px] leading-[1.1] font-bold">{doc.name || "Your name"}</div>
        {doc.headline && <div className="mt-1 text-center text-[10.5px]">{doc.headline}</div>}
        {contact.length > 0 && <div className="mt-[3px] text-center text-[9.5px]">{contact.join("  |  ")}</div>}
        {doc.sections.map((section) => (
          <div key={section.type} className="mt-2.5">
            <div className="mb-1 border-b-[0.75px] border-[#111] pb-[1.5px] text-[11px] font-bold tracking-[0.6px] uppercase">{section.title}</div>
            {section.entries.map((e) =>
              section.type === "skills" ? (
                <div key={e.item_id} className="mb-[1.5px]"><b>{e.title}: </b>{e.subtitle}</div>
              ) : (
                <div key={e.item_id} className="mb-[5px]">
                  <div className="flex justify-between gap-4">
                    <span className="truncate">
                      <b>{e.title}</b>
                      {(section.type === "project" || section.type === "award") && e.tech.length > 0 && <i className="text-[9.5px]"> | {e.tech.join(", ")}</i>}
                    </span>
                    <span className="shrink-0">{e.dates}</span>
                  </div>
                  {section.type !== "project" && section.type !== "award" && (e.subtitle || e.location) && (
                    <div className="flex justify-between gap-4 text-[9.5px] italic"><span>{e.subtitle}</span><span>{e.location}</span></div>
                  )}
                  {e.bullets.map((b) => (
                    <div key={b.id} className="mt-[1.5px] flex pl-2"><span className="w-[9px] shrink-0">•</span><span>{b.text}</span></div>
                  ))}
                </div>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

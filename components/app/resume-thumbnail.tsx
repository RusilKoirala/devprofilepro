import type { CSSProperties, ReactNode } from "react"
import { displayUrl } from "@/lib/resume/build"
import { sized, SHEETS, type Sheet } from "@/lib/resume/pdf/styles"
import type { ResumeDoc, ResumeEntry, ResumeSection } from "@/lib/resume/schema"
import { DEFAULT_TEMPLATE, SIDEBAR_SECTIONS, type TemplateId } from "@/lib/resume/templates"

// A miniature of the first page, drawn in HTML from the same ResumeDoc and the same design styles
// the PDF uses (lib/resume/pdf/styles.ts). Laid out at letter width (612px = 8.5in at 72dpi, so
// 1pt = 1px) and scaled down, so it looks like the real page without rendering a PDF per card.
const PAGE_WIDTH = 612

// react-pdf style → CSS: Helvetica variants become weight and slant, vertical/horizontal padding
// shorthands become CSS ones. Everything else is already valid CSS in px.
function css(style: Record<string, unknown>): CSSProperties {
  const { fontFamily, paddingVertical, paddingHorizontal, ...rest } = style
  const family = String(fontFamily ?? "")
  return {
    ...(rest as CSSProperties),
    ...(rest.flexDirection != null && { display: "flex" }),
    ...(family && { fontWeight: family.includes("Bold") ? 700 : 400, fontStyle: family.includes("Oblique") ? "italic" : "normal" }),
    ...(paddingVertical != null && { paddingTop: paddingVertical as number, paddingBottom: paddingVertical as number }),
    ...(paddingHorizontal != null && { paddingLeft: paddingHorizontal as number, paddingRight: paddingHorizontal as number }),
  }
}

type Css = { [K in keyof Sheet]: CSSProperties }
const toCss = (s: Sheet) => Object.fromEntries(Object.entries(s).map(([k, v]) => [k, css(v)])) as Css

const headingOnly = (type: string) => type === "project" || type === "award"

function Extras({ e, c }: { e: ResumeEntry; c: Css }) {
  return (
    <>
      {e.tech.length > 0 && <span style={c.subtitle}> | {e.tech.join(", ")}</span>}
      {e.url && <span style={c.subtitle}> | {displayUrl(e.url)}</span>}
    </>
  )
}

function Bullets({ e, c }: { e: ResumeEntry; c: Css }) {
  return e.bullets.map((b) => (
    <div key={b.id} style={c.bullet}><span style={{ ...c.dot, flexShrink: 0 }}>•</span><span style={c.bulletText}>{b.text}</span></div>
  ))
}

function Entry({ e, type, template, c }: { e: ResumeEntry; type: string; template: TemplateId; c: Css }) {
  const only = headingOnly(type)
  const [first, second] = template === "modern" && type === "job" ? [e.subtitle, e.title] : [e.title, e.subtitle]
  const head = (rest: ReactNode) => (
    <div style={{ ...c.row, gap: 16 }}>
      <span style={{ flex: 1 }}><span style={c.title}>{first}</span>{rest}{only && <Extras e={e} c={c} />}</span>
      <span style={{ ...c.dates, flexShrink: 0 }}>{e.dates}</span>
    </div>
  )
  if (template === "compact") {
    const rest = only ? [] : [second, e.location].filter(Boolean)
    return <div style={c.entry}>{head(rest.length > 0 && <span style={c.subtitle}>{`  ·  ${rest.join("  ·  ")}`}</span>)}<Bullets e={e} c={c} /></div>
  }
  return (
    <div style={c.entry}>
      {head(null)}
      {!only && (second || e.location) && <div style={c.row}><span style={c.subtitle}>{second}</span><span style={c.subtitle}>{e.location}</span></div>}
      <Bullets e={e} c={c} />
    </div>
  )
}

function Section({ section, template, c }: { section: ResumeSection; template: TemplateId; c: Css }) {
  return (
    <div style={c.section}>
      <div style={c.sectionTitle}>{section.title}</div>
      {section.type === "skills"
        ? section.entries.map((e) => <div key={e.item_id} style={c.skillRow}><span><span style={c.skillLabel}>{e.title}: </span>{e.subtitle}</span></div>)
        : section.entries.map((e) => <Entry key={e.item_id} e={e} type={section.type} template={template} c={c} />)}
    </div>
  )
}

function SideSection({ section, c }: { section: ResumeSection; c: Css }) {
  return (
    <div style={c.section}>
      <div style={c.sectionTitle}>{section.title}</div>
      {section.entries.map((e) => (
        <div key={e.item_id} style={{ marginBottom: 5 }}>
          <div style={c.title}>{e.title}</div>
          {e.subtitle && <div style={section.type === "skills" ? {} : c.subtitle}>{e.subtitle}</div>}
          {(e.dates || e.location) && <div>{[e.dates, e.location].filter(Boolean).join(" | ")}</div>}
          <Bullets e={e} c={c} />
        </div>
      ))}
    </div>
  )
}

export function ResumeThumbnail({ doc, width = 184, template }: { doc: ResumeDoc; width?: number; template?: TemplateId }) {
  const t = template ?? (SHEETS[doc.template] ? doc.template : DEFAULT_TEMPLATE)
  // Another design than the saved one is previewed at 10pt: its own fit isn't known yet.
  const c = toCss(sized(t, template && template !== doc.template ? 10 : (doc.size ?? 10)))
  const scale = width / PAGE_WIDTH
  const contact = [doc.contact.phone, doc.contact.email, doc.contact.location, ...[doc.contact.linkedin, doc.contact.github, doc.contact.website].filter(Boolean).map(displayUrl)].filter(Boolean)
  const side = doc.sections.filter((s) => SIDEBAR_SECTIONS.has(s.type))
  const main = doc.sections.filter((s) => !SIDEBAR_SECTIONS.has(s.type))
  return (
    <div aria-hidden className="relative overflow-hidden bg-white" style={{ width, height: width * (11 / 8.5) }}>
      <div className="absolute top-0 left-0 origin-top-left font-[Helvetica,Arial,sans-serif]" style={{ ...c.page, width: PAGE_WIDTH, transform: `scale(${scale})` }}>
        <div style={c.name}>{doc.name || "Your name"}</div>
        {doc.headline && <div style={c.headline}>{doc.headline}</div>}
        {contact.length > 0 && <div style={c.contact}>{contact.join("  |  ")}</div>}
        {t === "sidebar" && side.length > 0 && main.length > 0 ? (
          <div style={{ display: "flex", marginTop: 2 }}>
            <div style={{ width: "32%", paddingRight: 12 }}>{side.map((s) => <SideSection key={s.type} section={s} c={c} />)}</div>
            <div style={{ flex: 1, paddingLeft: 12, borderLeft: "0.5px solid #c8ced6" }}>{main.map((s) => <Section key={s.type} section={s} template={t} c={c} />)}</div>
          </div>
        ) : (
          doc.sections.map((s) => <Section key={s.type} section={s} template={t} c={c} />)
        )}
      </div>
    </div>
  )
}

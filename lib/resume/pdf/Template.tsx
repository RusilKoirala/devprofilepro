import { Document, Link, Page, Text, View } from "@react-pdf/renderer"
import { displayUrl } from "@/lib/resume/build"
import type { ResumeDoc, ResumeEntry, ResumeSection } from "@/lib/resume/schema"
import { sized, SHEETS, type Sheet } from "@/lib/resume/pdf/styles"
import { DEFAULT_TEMPLATE, SIDEBAR_SECTIONS, type TemplateId } from "@/lib/resume/templates"

const isHeadingOnly = (type: string) => type === "project" || type === "award"

function ContactLine({ contact, s }: { contact: ResumeDoc["contact"]; s: Sheet }) {
  const parts = [
    contact.phone && { text: contact.phone },
    contact.email && { text: contact.email, href: `mailto:${contact.email}` },
    contact.location && { text: contact.location },
    contact.linkedin && { text: displayUrl(contact.linkedin), href: contact.linkedin },
    contact.github && { text: displayUrl(contact.github), href: contact.github },
    contact.website && { text: displayUrl(contact.website), href: contact.website },
  ].filter(Boolean) as { text: string; href?: string }[]
  // One Text run with real " | " separators, so parsers read clean, spaced text.
  return (
    <Text style={s.contact}>
      {parts.map((p, i) => (
        <Text key={i}>
          {i > 0 && "  |  "}
          {p.href ? <Link src={p.href} style={s.link}>{p.text}</Link> : p.text}
        </Text>
      ))}
    </Text>
  )
}

function ProjectExtras({ entry, s }: { entry: ResumeEntry; s: Sheet }) {
  return (
    <>
      {entry.tech.length > 0 && <Text style={s.subtitle}> | {entry.tech.join(", ")}</Text>}
      {entry.url && (
        <Text style={s.subtitle}>
          {" | "}
          <Link src={entry.url} style={s.link}>{displayUrl(entry.url)}</Link>
        </Text>
      )}
    </>
  )
}

function Bullets({ entry, s }: { entry: ResumeEntry; s: Sheet }) {
  return entry.bullets.map((b) => (
    <View key={b.id} style={s.bullet}>
      <Text style={s.dot}>•</Text>
      <Text style={s.bulletText}>{b.text}</Text>
    </View>
  ))
}

function Entry({ entry, type, template, s }: { entry: ResumeEntry; type: string; template: TemplateId; s: Sheet }) {
  const headingOnly = isHeadingOnly(type)
  // Modern leads with the company (as recruiters search by it), Classic with the role.
  const [first, second] = template === "modern" && type === "job" ? [entry.subtitle, entry.title] : [entry.title, entry.subtitle]
  if (template === "compact") {
    const rest = headingOnly ? [] : [second, entry.location].filter(Boolean)
    return (
      <View style={s.entry}>
        <View style={s.row} wrap={false}>
          <Text style={{ flex: 1 }}>
            <Text style={s.title}>{first}</Text>
            {rest.length > 0 && <Text style={s.subtitle}>{`  ·  ${rest.join("  ·  ")}`}</Text>}
            {headingOnly && <ProjectExtras entry={entry} s={s} />}
          </Text>
          <Text style={s.dates}>{entry.dates}</Text>
        </View>
        <Bullets entry={entry} s={s} />
      </View>
    )
  }
  return (
    <View style={s.entry}>
      <View style={s.row} wrap={false}>
        <Text style={{ flex: 1 }}>
          <Text style={s.title}>{first}</Text>
          {headingOnly && <ProjectExtras entry={entry} s={s} />}
        </Text>
        <Text style={s.dates}>{entry.dates}</Text>
      </View>
      {!headingOnly && (second || entry.location) && (
        <View style={s.row}>
          <Text style={s.subtitle}>{second}</Text>
          <Text style={s.subtitle}>{entry.location}</Text>
        </View>
      )}
      <Bullets entry={entry} s={s} />
    </View>
  )
}

function Section({ section, template, s }: { section: ResumeSection; template: TemplateId; s: Sheet }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{section.title}</Text>
      {section.type === "skills"
        ? section.entries.map((e) => (
            <View key={e.item_id} style={s.skillRow}>
              <Text>
                <Text style={s.skillLabel}>{e.title}: </Text>
                {e.subtitle}
              </Text>
            </View>
          ))
        : section.entries.map((e) => <Entry key={e.item_id} entry={e} type={section.type} template={template} s={s} />)}
    </View>
  )
}

// The narrow column stacks everything: label over value, no right-aligned dates.
function SideSection({ section, s }: { section: ResumeSection; s: Sheet }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{section.title}</Text>
      {section.entries.map((e) => (
        <View key={e.item_id} style={{ marginBottom: 5 }}>
          <Text style={s.title}>{e.title}</Text>
          {e.subtitle && <Text style={section.type === "skills" ? {} : s.subtitle}>{e.subtitle}</Text>}
          {[e.dates, e.location].filter(Boolean).length > 0 && <Text>{[e.dates, e.location].filter(Boolean).join(" | ")}</Text>}
          <Bullets entry={e} s={s} />
        </View>
      ))}
    </View>
  )
}

export function ResumePdf({ doc }: { doc: ResumeDoc }) {
  const s = sized(SHEETS[doc.template] ? doc.template : DEFAULT_TEMPLATE, doc.size ?? 10)
  const header = (
    <>
      <Text style={s.name}>{doc.name}</Text>
      {doc.headline && <Text style={s.headline}>{doc.headline}</Text>}
      <ContactLine contact={doc.contact} s={s} />
    </>
  )
  const side = doc.sections.filter((sec) => SIDEBAR_SECTIONS.has(sec.type))
  const main = doc.sections.filter((sec) => !SIDEBAR_SECTIONS.has(sec.type))
  return (
    <Document title={`${doc.name} Resume`} author={doc.name} creator="DevProfile">
      <Page size="LETTER" style={s.page}>
        {header}
        {doc.template === "sidebar" && side.length > 0 && main.length > 0 ? (
          <View style={{ flexDirection: "row", marginTop: 2 }}>
            <View style={{ width: "32%", paddingRight: 12 }}>
              {side.map((section) => <SideSection key={section.type} section={section} s={s} />)}
            </View>
            <View style={{ flex: 1, paddingLeft: 12, borderLeftWidth: 0.5, borderLeftColor: "#c8ced6" }}>
              {main.map((section) => <Section key={section.type} section={section} template={doc.template} s={s} />)}
            </View>
          </View>
        ) : (
          doc.sections.map((section) => <Section key={section.type} section={section} template={doc.template} s={s} />)
        )}
      </Page>
    </Document>
  )
}

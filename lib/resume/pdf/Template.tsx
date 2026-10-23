import { Document, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer"
import { displayUrl } from "@/lib/resume/build"
import type { ResumeDoc, ResumeEntry } from "@/lib/resume/schema"

// Jake's-Resume-style single column. Font sizes are fixed: we never shrink text to fit.
const s = StyleSheet.create({
  page: { paddingVertical: 32, paddingHorizontal: 40, fontFamily: "Helvetica", fontSize: 10, lineHeight: 1.3, color: "#111" },
  name: { fontSize: 22, lineHeight: 1.1, fontFamily: "Helvetica-Bold", textAlign: "center" },
  headline: { fontSize: 10.5, textAlign: "center", marginTop: 4 },
  contact: { textAlign: "center", marginTop: 3, fontSize: 9.5 },
  link: { color: "#111", textDecoration: "none" },
  section: { marginTop: 10 },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.6, borderBottomWidth: 0.75, borderBottomColor: "#111", paddingBottom: 1.5, marginBottom: 4 },
  entry: { marginBottom: 5 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  bold: { fontFamily: "Helvetica-Bold" },
  italic: { fontFamily: "Helvetica-Oblique", fontSize: 9.5 },
  bullet: { flexDirection: "row", marginTop: 1.5, paddingLeft: 8 },
  dot: { width: 9 },
  bulletText: { flex: 1 },
  skillRow: { flexDirection: "row", marginBottom: 1.5 },
})

function ContactLine({ contact }: { contact: ResumeDoc["contact"] }) {
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

function Entry({ entry, type }: { entry: ResumeEntry; type: string }) {
  const isProject = type === "project" || type === "award"
  return (
    <View style={s.entry}>
      <View style={s.row} wrap={false}>
        <Text>
          <Text style={s.bold}>{entry.title}</Text>
          {isProject && entry.tech.length > 0 && <Text style={s.italic}> | {entry.tech.join(", ")}</Text>}
          {isProject && entry.url && (
            <Text style={s.italic}>
              {" | "}
              <Link src={entry.url} style={s.link}>{displayUrl(entry.url)}</Link>
            </Text>
          )}
        </Text>
        <Text>{entry.dates}</Text>
      </View>
      {!isProject && (entry.subtitle || entry.location) && (
        <View style={s.row}>
          <Text style={s.italic}>{entry.subtitle}</Text>
          <Text style={s.italic}>{entry.location}</Text>
        </View>
      )}
      {entry.bullets.map((b) => (
        <View key={b.id} style={s.bullet}>
          <Text style={s.dot}>•</Text>
          <Text style={s.bulletText}>{b.text}</Text>
        </View>
      ))}
    </View>
  )
}

export function ResumePdf({ doc }: { doc: ResumeDoc }) {
  return (
    <Document title={`${doc.name} Resume`} author={doc.name} creator="DevProfile">
      <Page size="LETTER" style={s.page}>
        <Text style={s.name}>{doc.name}</Text>
        {doc.headline && <Text style={s.headline}>{doc.headline}</Text>}
        <ContactLine contact={doc.contact} />
        {doc.sections.map((section) => (
          <View key={section.type} style={s.section}>
            <Text style={s.sectionTitle}>{section.title}</Text>
            {section.type === "skills"
              ? section.entries.map((e) => (
                  <View key={e.item_id} style={s.skillRow}>
                    <Text>
                      <Text style={s.bold}>{e.title}: </Text>
                      {e.subtitle}
                    </Text>
                  </View>
                ))
              : section.entries.map((e) => <Entry key={e.item_id} entry={e} type={section.type} />)}
          </View>
        ))}
      </Page>
    </Document>
  )
}

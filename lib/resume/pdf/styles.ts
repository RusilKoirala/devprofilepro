import type { TemplateId } from "@/lib/resume/templates"

const base = {
  page: { paddingVertical: 32, paddingHorizontal: 40, fontFamily: "Helvetica", fontSize: 10, lineHeight: 1.3, color: "#111" },
  name: { fontSize: 22, lineHeight: 1.1, fontFamily: "Helvetica-Bold", textAlign: "center" as const },
  headline: { fontSize: 10.5, textAlign: "center" as const, marginTop: 4 },
  contact: { textAlign: "center" as const, marginTop: 3, fontSize: 10 },
  link: { color: "#111", textDecoration: "none" as const },
  section: { marginTop: 10 },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", textTransform: "uppercase" as const, letterSpacing: 0.6, borderBottomWidth: 0.75, borderBottomColor: "#111", paddingBottom: 1.5, marginBottom: 4 },
  entry: { marginBottom: 5 },
  row: { flexDirection: "row" as const, justifyContent: "space-between" as const },
  title: { fontFamily: "Helvetica-Bold" },
  dates: {},
  subtitle: { fontFamily: "Helvetica-Oblique" },
  bullet: { flexDirection: "row" as const, marginTop: 1.5, paddingLeft: 8 },
  dot: { width: 9 },
  bulletText: { flex: 1 },
  skillRow: { flexDirection: "row" as const, marginBottom: 1.5 },
  skillLabel: { fontFamily: "Helvetica-Bold" },
}
export type Sheet = typeof base

function sheet(overrides: { [K in keyof Sheet]?: Record<string, unknown> }): Sheet {
  return Object.fromEntries(Object.entries(base).map(([k, v]) => [k, { ...v, ...overrides[k as keyof Sheet] }])) as Sheet
}

const NAVY = "#1C033C"
const VIOLET = "#371e77"
const SLATE = "#1e3a5f"

export const SHEETS: Record<TemplateId, Sheet> = {
  classic: sheet({}),
  modern: sheet({
    page: { paddingVertical: 30 },
    name: { fontSize: 24, color: NAVY },
    contact: { color: VIOLET },
    link: { color: VIOLET },
    sectionTitle: { fontSize: 13, fontFamily: "Helvetica", textTransform: "none", letterSpacing: 0.2, color: NAVY, borderBottomColor: NAVY },
    title: { color: NAVY },
    dates: { color: VIOLET },
    subtitle: { fontFamily: "Helvetica-BoldOblique", color: VIOLET },
    dot: { width: 9, color: VIOLET },
    skillLabel: { color: NAVY },
  }),
  compact: sheet({
    page: { paddingVertical: 26, paddingHorizontal: 34, lineHeight: 1.25 },
    name: { fontSize: 20, textAlign: "left" },
    headline: { textAlign: "left", marginTop: 2 },
    contact: { textAlign: "left", marginTop: 2 },
    section: { marginTop: 7 },
    sectionTitle: { fontSize: 10.5, letterSpacing: 1, borderBottomWidth: 0.5, borderBottomColor: "#888", paddingBottom: 1, marginBottom: 3 },
    entry: { marginBottom: 3.5 },
    bullet: { flexDirection: "row", marginTop: 1, paddingLeft: 6 },
    dot: { width: 8 },
  }),
  sidebar: sheet({
    page: { paddingVertical: 30, paddingHorizontal: 34 },
    name: { fontSize: 24, textAlign: "left", color: SLATE },
    headline: { textAlign: "left", marginTop: 2 },
    contact: { textAlign: "left", marginTop: 3 },
    section: { marginTop: 9 },
    sectionTitle: { fontSize: 11, letterSpacing: 1, color: SLATE, borderBottomColor: SLATE, borderBottomWidth: 0.5 },
    title: { color: SLATE },
  }),
}

const SCALED = new Set(["fontSize", "marginTop", "marginBottom", "paddingBottom"])
const cache = new Map<string, Sheet>()
export function sized(template: TemplateId, size: number): Sheet {
  const key = `${template}:${size}`
  if (!cache.has(key)) {
    const k = size / 10
    const scale = (style: Record<string, unknown>) => Object.fromEntries(Object.entries(style).map(([p, v]) => [p, SCALED.has(p) && typeof v === "number" ? v * k : v]))
    cache.set(key, Object.fromEntries(Object.entries(SHEETS[template]).map(([name, style]) => [name, scale(style)])) as unknown as Sheet)
  }
  return cache.get(key)!
}

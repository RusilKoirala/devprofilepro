// Entries that are probably the same thing read twice: one freelance period under two job titles,
// one employer spelled two ways, one repo under two names. Exact identity keys (types.ts dedupeKey)
// miss these, so the Career Record suggests merges and the person decides. Pure code.
import { dateValue } from "@/lib/resume/dates"
import type { Item, ItemData } from "@/lib/record/types"

export interface DuplicatePair {
  a: string
  b: string
  // Why we think so, in plain words.
  why: string
}

const SUFFIX = /\b(inc|llc|ltd|limited|gmbh|corp|corporation|co|company|pvt|private|plc|the)\b/g

function words(s?: string | null): string[] {
  return (s ?? "").toLowerCase().replace(/\(.*?\)/g, " ").replace(SUFFIX, " ").match(/[a-z0-9]+/g) ?? []
}

function squash(s?: string | null) {
  return words(s).join("")
}

// "Layer5" ~ "Layer5, Inc." ~ "Layer5 (Meshery)"; "Acme" !~ "Acme Bank Holdings Group".
export function similarName(x?: string | null, y?: string | null): boolean {
  const a = squash(x)
  const b = squash(y)
  if (a.length < 3 || b.length < 3) return false
  if (a === b) return true
  const [short, long] = a.length <= b.length ? [a, b] : [b, a]
  if (long.startsWith(short) && short.length / long.length >= 0.5) return true
  const wa = new Set(words(x))
  const wb = new Set(words(y))
  let shared = 0
  for (const w of wa) if (wb.has(w)) shared++
  return shared / (wa.size + wb.size - shared) >= 0.6
}

function range(d: Pick<ItemData, "start" | "end">): [number, number] | null {
  const start = d.start ? dateValue(d.start) : null
  if (start == null) return null
  const end = d.end ? dateValue(d.end) : start
  return [start, end == null ? start : end]
}

// Two periods share at least a month.
function overlaps(a: Pick<ItemData, "start" | "end">, b: Pick<ItemData, "start" | "end">): boolean | null {
  const ra = range(a)
  const rb = range(b)
  if (!ra || !rb) return null
  return ra[0] <= rb[1] && rb[0] <= ra[1]
}

function sameDates(a: ItemData, b: ItemData) {
  return !!a.start && !!b.start && squash(a.start) === squash(b.start) && squash(a.end ?? "") === squash(b.end ?? "")
}

function why(a: Item, b: Item): string | null {
  const x = a.data
  const y = b.data
  switch (a.type) {
    case "job": {
      const company = similarName(x.company, y.company)
      const overlap = overlaps(x, y)
      if (company && overlap !== false) return overlap ? "Same employer, at the same time" : "Same employer"
      if (sameDates(x, y)) return "Exactly the same dates"
      return null
    }
    case "project":
    case "award": {
      if (x.url && y.url && squash(x.url) === squash(y.url)) return "Same link"
      return similarName(x.name, y.name) ? "Same name" : null
    }
    case "education":
      return similarName(x.school, y.school) && overlaps(x, y) !== false ? "Same school" : null
    default:
      return null
  }
}

export function findDuplicateEntries(items: Pick<Item, "id" | "type" | "data">[]): DuplicatePair[] {
  const pairs: DuplicatePair[] = []
  const used = new Set<string>()
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i] as Item
      const b = items[j] as Item
      if (a.type !== b.type || a.type === "contact" || a.type === "skills") continue
      if (used.has(a.id) || used.has(b.id)) continue
      if (a.data.distinct_from?.includes(b.id) || b.data.distinct_from?.includes(a.id)) continue
      const reason = why(a, b)
      if (!reason) continue
      pairs.push({ a: a.id, b: b.id, why: reason })
      // One suggestion per entry at a time; the next shows once this one is settled.
      used.add(a.id)
      used.add(b.id)
    }
  }
  return pairs
}

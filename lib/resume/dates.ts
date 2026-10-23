// Resume date strings as written in the sources ("Jun 2024", "2023", "06/2024", "Present").
// Pure code, shared by the date check and reverse-chronological ordering.

const MONTHS = "jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec"

export function dateFormat(d: string): string {
  if (new RegExp(`^(${MONTHS})[a-z]*\\.? \\d{4}$`, "i").test(d)) return "Mon YYYY"
  if (/^\d{4}$/.test(d)) return "YYYY"
  if (/^\d{1,2}\/\d{4}$/.test(d)) return "MM/YYYY"
  if (/^(present|current|now)$/i.test(d)) return "present"
  return "other"
}

// Months since year 0, Infinity for "Present", null when we can't read it.
export function dateValue(d: string): number | null {
  const t = d.trim()
  if (dateFormat(t) === "present") return Infinity
  if (dateFormat(t) === "other") return null
  const year = Number(t.match(/\d{4}/)?.[0])
  const numericMonth = t.match(/^(\d{1,2})\//)?.[1]
  const month = numericMonth ? Number(numericMonth) - 1 : ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(t.slice(0, 3).toLowerCase())
  if (numericMonth && (month < 0 || month > 11)) return null
  return year * 12 + Math.max(0, month)
}

// Newest first: by end date (Present first), then start date. Undated entries sort last.
export function byRecency(a: { start?: string | null; end?: string | null }, b: { start?: string | null; end?: string | null }): number {
  const key = (x: typeof a) => [dateValue(x.end || x.start || ""), x.start ? dateValue(x.start) : null] as const
  const [ae, as] = key(a)
  const [be, bs] = key(b)
  const cmp = (x: number | null, y: number | null) => (x === y ? 0 : x == null ? 1 : y == null ? -1 : y - x)
  return cmp(ae, be) || cmp(as, bs)
}

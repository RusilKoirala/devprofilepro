export function normalizeForMatch(text: string): string {
  return text
   .normalize("NFKC")
    .replace(/[‘’‚‛′`]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/[•●▪◦‣∙·]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

export function quoteInSource(quote: string, rawText: string): boolean {
  const q = normalizeForMatch(quote)
  if (q.length < 3) return false
  return normalizeForMatch(rawText).includes(q)
}

export function groundItemData<T extends Record<string, string | string[] | null | undefined>>(data: T, rawTexts: string[]): T {
  const sources = rawTexts.map(normalizeForMatch)
  const supported = (value: string) => {
    const normalized = normalizeForMatch(value).replace(/^https?:\/\/(?:www\.)?/, "").replace(/\/$/, "")
    if (!normalized) return false
    const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const match = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "u")
    return sources.some((source) => match.test(source))
  }
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [
    key, Array.isArray(value) ? value.filter(supported) : typeof value === "string" && supported(value) ? value : null,
  ])) as T
}

export function looksImportant(text: string): boolean {
  return /\d/.test(text) || /\b(intern|engineer|developer|lead|manager|founder|cto|ceo)\b/i.test(text)
}

export interface CandidateFact {
  text: string
  source_id: string
  quote: string
}

export interface VerifyResult<F extends CandidateFact> {
  kept: F[]
  dropped: (F & { reason: "unknown_source" | "quote_not_found" | "unsupported_number" })[]
}

export function verifyFacts<F extends CandidateFact>(facts: F[], sources: Map<string, string>): VerifyResult<F> {
  const kept: F[] = []
  const dropped: VerifyResult<F>["dropped"] = []
  for (const f of facts) {
    const raw = sources.get(f.source_id)
    if (raw == null) dropped.push({ ...f, reason: "unknown_source" })
    else if (!quoteInSource(f.quote, raw)) dropped.push({ ...f, reason: "quote_not_found" })
    else if (unsupportedNumbers(f.text, [f.quote]).length) dropped.push({ ...f, reason: "unsupported_number" })
    else kept.push(f)
  }
  return { kept, dropped }
}

const AMOUNT = String.raw`\d+(?:,\d{3})*(?:\.\d+)?(?:\s*(?:[kKmMbB]\b|thousand\b|million\b|billion\b))?`
const QUANTITY = new RegExp(String.raw`(?:[~≈<>≤≥]|\b(?:about|around|approximately|at least|at most|over|under)\s+)?\s*${AMOUNT}(?:\s*[-–—]\s*${AMOUNT})?\s*(?:\+|%|percent\b)?`, "gi")

function quantities(text: string) {
  return [...text.matchAll(QUANTITY)].map(([raw]) => {
    let value = raw.trim().toLowerCase().replace(/,/g, "").replace(/[–—]/g, "-")
    const approximate = /^(?:[~≈]|about\b|around\b|approximately\b)/.test(value)
    value = value.replace(/^(?:[~≈]|about\s+|around\s+|approximately\s+)/, "")
      .replace(/^at least\s+/, "≥").replace(/^at most\s+/, "≤")
      .replace(/^over\s+/, ">").replace(/^under\s+/, "<")
      .replace(/percent$/, "%")
      .replace(/(\d+(?:\.\d+)?)\s*(k\b|m\b|b\b|thousand\b|million\b|billion\b)/g, (_, n: string, scale: string) =>
        String(Number(n) * (/^(k|thousand)$/.test(scale) ? 1e3 : /^(m|million)$/.test(scale) ? 1e6 : 1e9)))
      .replace(/\s/g, "")
    return { raw: raw.trim().replace(/\s/g, ""), value, approximate }
  })
}

export function numbersIn(text: string): string[] {
  return quantities(text).map((q) => q.raw)
}

export function unsupportedNumbers(bullet: string, factTexts: string[]): string[] {
  const available = factTexts.flatMap(quantities)
  return quantities(bullet)
    .filter((q) => !available.some((f) => f.value === q.value && (q.approximate || !f.approximate)))
    .map((q) => q.raw)
}

export const BANNED_WORDS = [
  "spearheaded", "leveraged", "leveraging", "synergy", "synergies", "passionate", "results-driven",
  "cutting-edge", "cutting edge", "rockstar", "ninja", "guru", "go-getter", "detail-oriented",
  "dynamic", "innovative", "world-class", "best-in-class", "utilized", "seamlessly",
]

export function bannedWordsIn(text: string): string[] {
  const t = text.toLowerCase()
  return BANNED_WORDS.filter((w) => new RegExp(`\\b${w.replace(/[-\s]/g, "[-\\s]")}\\b`).test(t))
}

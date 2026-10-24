import { hasTerm, knownTermsIn } from "@/lib/ats/keywords"
import type { ResumeDoc } from "@/lib/resume/schema"

// Does a piece of text actually support a job requirement? Plain code, used twice: when a match
// report is made (are the facts the AI cited about the requirement at all?) and when it is shown
// (is the supporting text still on the page?). It is a word check, not a judgment of skill: a
// requirement counts as supported only when the evidence names what it asks for.

export type Support = "full" | "partial" | "none" | "unknown"

// Weaker forms that show part of a requirement but not all of it: a Dockerfile in a repo is some
// Docker evidence, not proof of running containers in production.
const WEAK: Record<string, string[]> = {
  Docker: ["Dockerfile", "docker-compose"],
  Kubernetes: ["Helm"],
  "CI/CD": ["GitHub Actions", "Jenkins"],
}

// Known terms that are also ordinary words, so "unit tests" counts for "Testing".
const STEMMED = new Set(["Testing", "Unit testing", "Performance", "Security", "Monitoring", "Accessibility", "Observability", "Microservices", "Serverless"])

// Words that say how much or what kind, not what: they don't need evidence of their own.
const FILLER = new Set(
  (
    "a an and or the of in on to for with by as at from into via using use used such like etc " +
    "experience experienced strong solid good great excellent deep proven demonstrated hands knowledge understanding " +
    "familiarity familiar proficiency proficient ability able skill skills year years plus least minimum preferred bonus nice " +
    "have has must should will can comfortable working work professional practical relevant related similar " +
    "build building built develop developing development maintain maintaining application applications app apps software " +
    "modern best practice practices environment environments based level high quality code coding solution solutions " +
    "backend frontend full stack fullstack web end team teams across within other including new one more"
  ).split(" ")
)

function stem(word: string) {
  return word.replace(/(ations?|ments?|ings?|ers?|ed|ly|es|s)$/, "") || word
}

function tokens(text: string) {
  return text.toLowerCase().match(/[a-z][a-z0-9]+/g) ?? []
}

// Same stem, allowing for different endings ("deploying" ~ "deployed", "operations" ~ "operated").
function sameWord(a: string, b: string) {
  const x = stem(a), y = stem(b)
  if (x.length < 4 || y.length < 4) return x === y
  const n = Math.min(x.length, y.length, 5)
  return x.slice(0, n) === y.slice(0, n)
}

function termScore(term: string, evidence: string): number {
  if (hasTerm(evidence, term)) return 1
  if (STEMMED.has(term)) {
    const words = tokens(evidence)
    if (tokens(term).every((t) => FILLER.has(t) || words.some((w) => sameWord(t, w)))) return 1
  }
  return (WEAK[term] ?? []).some((w) => hasTerm(evidence, w)) ? 0.5 : 0
}

// What a requirement asks for: the skills and tools it names, or when it names none, its own
// content words ("deploying", "remotely").
export function requirementTerms(requirement: string): { terms: string[]; words: string[]; anyOf: boolean } {
  const terms = knownTermsIn(requirement)
  const words = terms.length ? [] : [...new Set(tokens(requirement).filter((w) => w.length > 2 && !FILLER.has(w)))]
  return { terms, words, anyOf: /\bor\b|\//i.test(requirement) }
}

// "full": everything the requirement asks for is in the evidence (any one, for "X or Y").
// "partial": some of it, or only a weaker form. "none": nothing. "unknown": the requirement names
// nothing checkable ("Strong communication"), so code can't say either way.
export function support(requirement: string, evidence: string[]): Support {
  const { terms, words, anyOf } = requirementTerms(requirement)
  if (!terms.length && !words.length) return "unknown"
  const text = evidence.join("\n")
  const evidenceWords = tokens(text)
  const scores = [...terms.map((t) => termScore(t, text)), ...words.map((w) => (evidenceWords.some((e) => sameWord(w, e)) ? 1 : 0))]
  const best = Math.max(...scores)
  if (anyOf ? best === 1 : scores.every((s) => s === 1)) return "full"
  return best > 0 ? "partial" : "none"
}

// The named skills and tools in a sentence that the evidence never mentions. Used on the short
// explanation given for each entry: "Kubernetes expertise" about a JavaScript page is dropped.
export function unsupportedTerms(sentence: string, evidence: string[]): string[] {
  const text = evidence.join("\n")
  return knownTermsIn(sentence).filter((t) => termScore(t, text) === 0)
}

// What is printed on the page now: each entry's own heading, details and tech, and each line with
// the facts it cites. Coverage is worked out from this, not from what the report said at the time.
export interface PageEvidence {
  entries: { itemId: string; text: string }[]
  lines: { id: string; itemId: string; text: string; factIds: string[] }[]
}

type Line = PageEvidence["lines"][number]
export type Shown =
  | { state: "covered" | "partial"; itemIds: string[]; line?: Line }
  | { state: "cut"; itemIds: string[] }
  | { state: "lines_cut"; itemIds: string[] }
  | { state: "elsewhere"; itemIds: string[] }
  | { state: "missing" }

// A requirement against the page as it is now. Covered needs text on the page that names what
// it asks for, from the entries and facts the report cited: remove the last such line and it isn't.
export function requirementOnPage(r: { status: string; item_ids: string[]; fact_ids?: string[]; text: string }, page: PageEvidence, legacy: boolean): Shown {
  if (r.status === "not_found") return { state: "missing" }
  const entries = page.entries.filter((e) => r.item_ids.includes(e.itemId))
  if (!entries.length) return { state: r.status === "elsewhere" ? "elsewhere" : "cut", itemIds: r.item_ids }
  const cited = new Set(r.fact_ids ?? [])
  // Old reports cite entries, not facts, so any line of a cited entry may be the evidence.
  const lines = page.lines.filter((l) => r.item_ids.includes(l.itemId) && (legacy || !cited.size || l.factIds.some((f) => cited.has(f))))
  const itemIds = entries.map((e) => e.itemId)
  const s = support(r.text, [...lines.map((l) => l.text), ...entries.map((e) => e.text)])
  if (s === "none" || (s === "unknown" && !lines.length)) return { state: "lines_cut", itemIds }
  const line = lines.find((l) => support(r.text, [l.text]) !== "none") ?? lines[0]
  return { state: s === "full" && r.status !== "unclear" ? "covered" : "partial", itemIds, line }
}

// The text an entry actually prints, by the same rules as the PDF and .tex templates: projects and
// awards print their title and tech, everything else its title and subtitle (a skills group's list).
// Data the templates don't print, like tech stored on a job or skills group, is never evidence here.
export function printedText(type: string, entry: { title: string; subtitle: string; tech: string[] }) {
  const parts = type === "project" || type === "award" ? [entry.title, ...entry.tech] : [entry.title, entry.subtitle]
  return parts.filter(Boolean).join(", ")
}

// Page evidence from the rendered document and the facts each printed line cites.
export function pageEvidence(doc: Pick<ResumeDoc, "sections">, bulletFacts: Record<string, string[]>): PageEvidence {
  const entries = doc.sections.flatMap((s) => s.entries.map((e) => ({ type: s.type, e })))
  return {
    entries: entries.map(({ type, e }) => ({ itemId: e.item_id, text: printedText(type, e) })),
    lines: entries.flatMap(({ e }) => e.bullets.map((b) => ({ id: b.id, itemId: e.item_id, text: b.text, factIds: bulletFacts[b.id] ?? [] }))),
  }
}

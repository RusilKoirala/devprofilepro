import { hasTerm, knownTermsIn, termSpans } from "@/lib/ats/keywords"
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
    "backend frontend full stack fullstack web end team teams across within other including new one more " +
    "write writing wrote implement implementing integrate integrating create creating ensure deliver delivering"
  ).split(" ")
)

// Words a requirement shares with almost any developer's work. They're part of what it asks for
// ("automated integration tests"), but on their own they show nothing: "responsive interfaces"
// isn't evidence of "keyboard-friendly interfaces", nor an installer's "automated setups" of tests.
const GENERIC = ["api", "apis", "interface", "automated", "automation", "integration", "system", "service", "tool", "data", "user", "platform", "feature", "product", "process", "workflow", "setup", "client", "customer", "responsive", "scalable", "performant", "reliable", "robust", "clean", "maintainable", "efficient"]

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

// One thing a requirement can be shown by: a known skill or tool, or a plain word.
export type Operand = { term: string } | { word: string }

const GENERIC_TERMS = new Set(["APIs"])
function generic(o: Operand) {
  return "term" in o ? GENERIC_TERMS.has(o.term) : GENERIC.some((g) => sameWord(o.word.toLowerCase(), g))
}
const label = (o: Operand) => ("term" in o ? o.term : o.word)
interface Span { operand: Operand; start: number; end: number }

const OR_LINK = /^\s*,?\s*(?:\/|\bor\b)\s*$/i
const AND_LINK = /^\s*,?\s*(?:&|\band\b)\s*$/i
const COMMA_LINK = /^\s*,\s*$/
const WORD_AFTER_OR = /^\s*(?:\/|\bor\b)\s*([A-Za-z][A-Za-z0-9+#]*)/i
const WORD_BEFORE_OR = /([A-Za-z][A-Za-z0-9+#]*)\s*(?:\/|\bor\b)\s*$/i

// What a requirement asks for, as groups that each need one match. Only the operands joined by
// "or" or "/" are alternatives: "Go and Node.js" is [[Go], [Node.js]], "LLM/AI APIs" is
// [[LLM, AI], [APIs]], and "OpenAI or Anthropic LLM APIs" still needs LLM and APIs. A list
// ending in "or" ("Python, Go, or Java") is one group. With no known skills or tools, its own
// content words ("deploying", "remotely") are the operands.
export function requirementTerms(requirement: string): Operand[][] {
  let spans: Span[] = termSpans(requirement).map((s) => ({ operand: { term: s.term }, start: s.start, end: s.end }))
  const extra = new Map<number, Operand[]>()
  if (spans.length) {
    // A plain word offered as the other choice ("LLM/AI", "Docker or containerization").
    const inSpan = (at: number) => spans.some((s) => at >= s.start && at < s.end)
    spans.forEach((s, i) => {
      const words: Operand[] = []
      const after = WORD_AFTER_OR.exec(requirement.slice(s.end))
      if (after) {
        const at = s.end + after[0].length - after[1].length
        if (!inSpan(at) && !FILLER.has(after[1].toLowerCase())) words.push({ word: after[1] })
      }
      const before = WORD_BEFORE_OR.exec(requirement.slice(0, s.start))
      if (before && !inSpan(before.index) && !FILLER.has(before[1].toLowerCase())) words.push({ word: before[1] })
      if (words.length) extra.set(i, words)
    })
  } else {
    spans = [...requirement.matchAll(/[A-Za-z][A-Za-z0-9]+/g)]
      .filter((m) => m[0].length > 2 && !FILLER.has(m[0].toLowerCase()))
      .map((m) => ({ operand: { word: m[0] }, start: m.index, end: m.index + m[0].length }))
  }

  // Runs of operands joined by "or", "and" or commas. A run with "or" and no "and" is one set of
  // choices; otherwise only the pairs joined directly by "or" are.
  const links = spans.slice(1).map((s, i) => {
    const between = requirement.slice(spans[i].end, s.start)
    return OR_LINK.test(between) ? "or" : AND_LINK.test(between) ? "and" : COMMA_LINK.test(between) ? "comma" : null
  })
  const groups: Operand[][] = []
  let run: number[] = [0]
  const close = () => {
    const kinds = run.slice(1).map((i) => links[i - 1])
    const oneSet = kinds.includes("or") && !kinds.includes("and")
    run.forEach((i, n) => {
      const ops = [spans[i].operand, ...(extra.get(i) ?? [])]
      if (n > 0 && (oneSet || kinds[n - 1] === "or")) groups[groups.length - 1].push(...ops)
      else groups.push(ops)
    })
  }
  if (!spans.length) return []
  links.forEach((link, i) => {
    if (link) run.push(i + 1)
    else {
      close()
      run = [i + 1]
    }
  })
  close()
  // The same word twice ("API … APIs") asks for it once.
  const seen = new Set<string>()
  return groups.filter((g) => {
    const key = g.map((o) => ("term" in o ? `t:${o.term}` : `w:${o.word.toLowerCase()}`)).sort().join("|")
    return !seen.has(key) && !!seen.add(key)
  })
}

// "full": every group is in the evidence (any one choice of "X or Y" is enough). "partial": a
// distinctive part of it, or only a weaker form; matching only generic words ("APIs",
// "interfaces") doesn't count. "none": nothing. "unknown": the requirement names nothing checkable
// ("Strong communication"), so code can't say either way.
export function support(requirement: string, evidence: string[]): Support {
  return supportDetail(requirement, evidence).support
}

// The same, with what's shown and what's missing, so a partial match can say which part it is.
export function supportDetail(requirement: string, evidence: string[]): { support: Support; shown: string[]; missing: string[] } {
  const groups = requirementTerms(requirement)
  if (!groups.length) return { support: "unknown", shown: [], missing: [] }
  const text = evidence.join("\n")
  const evidenceWords = tokens(text)
  const score = (o: Operand) => ("term" in o ? termScore(o.term, text) : evidenceWords.some((e) => sameWord(o.word.toLowerCase(), e)) ? 1 : 0)
  const scored = groups.map((g) => {
    const scores = g.map(score)
    const best = Math.max(...scores)
    return { best, generic: g.every(generic), name: best > 0 ? label(g[scores.indexOf(best)]) : g.map(label).join(" or ") }
  })
  const shown = scored.filter((g) => g.best === 1).map((g) => g.name)
  const missing = scored.filter((g) => g.best < 1).map((g) => (g.best > 0 ? `${g.name} (only partly)` : g.name))
  if (scored.every((g) => g.best === 1)) return { support: "full", shown, missing: [] }
  // When everything it asks for is generic ("REST APIs" aside, just "APIs"), any of it counts.
  const counts = scored.every((g) => g.generic) ? scored : scored.filter((g) => !g.generic)
  return { support: counts.some((g) => g.best > 0) ? "partial" : "none", shown, missing }
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
  | { state: "covered" | "partial"; itemIds: string[]; line?: Line; shown?: string[]; missing?: string[] }
  | { state: "cut"; itemIds: string[] }
  | { state: "lines_cut"; itemIds: string[] }
  | { state: "elsewhere"; itemIds: string[] }
  | { state: "missing" }

// A requirement against the page as it is now. What is printed decides, wherever it is: an edit
// that keeps the words keeps the match (whatever facts the report first cited), a line added since
// counts, and removing the last line that names it un-covers it. The entries the report cited are
// looked at first, so the evidence offered is the one the person expects.
export function requirementOnPage(r: { status: string; item_ids: string[]; text: string }, page: PageEvidence): Shown {
  const cited = page.entries.filter((e) => r.item_ids.includes(e.itemId)).map((e) => e.itemId)
  const evidence = (ids: string[]) => [...page.lines.filter((l) => ids.includes(l.itemId)).map((l) => l.text), ...page.entries.filter((e) => ids.includes(e.itemId)).map((e) => e.text)]
  const lineFor = (ids: string[]) => {
    const lines = page.lines.filter((l) => ids.includes(l.itemId))
    return lines.find((l) => support(r.text, [l.text]) === "full") ?? lines.find((l) => support(r.text, [l.text]) === "partial") ?? lines[0]
  }
  const absent = (): Shown =>
    r.status === "elsewhere" && !cited.length ? { state: "elsewhere", itemIds: r.item_ids }
    : cited.length ? { state: "lines_cut", itemIds: cited }
    : r.status === "not_found" || !r.item_ids.length ? { state: "missing" }
    : { state: "cut", itemIds: r.item_ids }

  if (supportDetail(r.text, []).support === "unknown") {
    // Nothing code can check ("Strong communication"): the AI's cited entries stand, as partial at most.
    if (r.status === "not_found" || !cited.length) return absent()
    return { state: "partial", itemIds: cited, line: lineFor(cited) }
  }

  const each = page.entries.map((e) => ({ id: e.itemId, ...supportDetail(r.text, evidence([e.itemId])) }))
  const together = cited.length ? supportDetail(r.text, evidence(cited)) : null
  if (together?.support === "full") return { state: "covered", itemIds: cited, line: lineFor(cited) }
  const alone = each.find((e) => e.support === "full")
  if (alone) return { state: "covered", itemIds: [alone.id], line: lineFor([alone.id]) }
  // Two entries can show it between them: Go in one job, Node.js in another.
  const helping = each.filter((e) => e.support === "partial").map((e) => e.id)
  const all = helping.length > 1 ? supportDetail(r.text, evidence(helping)) : null
  if (all?.support === "full") return { state: "covered", itemIds: helping, line: lineFor(helping) }
  const part = together?.support === "partial" ? { ...together, ids: cited } : helping.length ? { ...each.find((e) => e.support === "partial")!, ids: [each.find((e) => e.support === "partial")!.id] } : null
  if (part) return { state: "partial", itemIds: part.ids, line: lineFor(part.ids), shown: part.shown, missing: part.missing }
  return absent()
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

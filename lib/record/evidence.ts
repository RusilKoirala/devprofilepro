import { hasTerm, knownTermsIn, termSpans } from "@/lib/ats/keywords"
import type { ResumeDoc } from "@/lib/resume/schema"

export type Support = "full" | "partial" | "none" | "unknown"

const WEAK: Record<string,  string[]> = {
  Docker: ["Dockerfile", "docker-compose"],
Kubernetes: ["Helm"],
  "CI/CD": ["GitHub Actions", "Jenkins"],
}

const STEMMED = new Set(["Testing", "Unit testing", "Performance", "Security", "Monitoring", "Accessibility", "Observability", "Microservices", "Serverless"])

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

 const GENERIC  = ["api", "apis", "interface", "automated", "automation", "integration", "system", "service", "tool", "data", "user", "platform", "feature", "product", "process", "workflow", "setup", "client", "customer", "responsive", "scalable", "performant", "reliable", "robust", "clean", "maintainable", "efficient"]

function stem(word: string)  {
  return word.replace(/(ations?|ments?|ings?|ers?|ed|ly|es|s)$/, "") || word
}

 function tokens( text: string)  {
  return text.toLowerCase().match(/[a-z][a-z0-9]+/g) ?? []
}

function sameWord(a: string, b: string) {
  const x = stem(a), y = stem(b)  
  // short words have to match exactly or everything matches everything
  if (x.length < 4 || y.length < 4) return x === y  
  const n = Math.min(x.length, y.length, 5)
  return x.slice( 0, n) === y.slice(0, n)
}

function termScore(term: string, evidence: string): number {
  if (hasTerm(evidence, term)) return 1    
  if (STEMMED.has(term)) {
     const words =tokens(evidence)
    if (tokens(term).every((t)  =>  FILLER.has(t) || words.some((w)=> sameWord(t, w)))) return 1
  }
  return ( WEAK[term] ?? []).some((w) => hasTerm(evidence, w)) ? 0.5 : 0
}

export type Operand= { term: string } | { word: string }

const GENERIC_TERMS = new Set(["APIs"])
   function generic(o: Operand) {  
 return "term" in o ? GENERIC_TERMS.has(o.term) : GENERIC.some((g) => sameWord(o.word.toLowerCase(),  g))
}

   const label = (o: Operand) => ("term" in o ? o.term : o.word)
interface Span { operand: Operand; start: number; end: number }

const OR_LINK = /^\s*,?\s*(?:\/|\bor\b)\s*$/i 
const AND_LINK = /^\s*,?\s*(?:&|\band\b)\s*$/i

const COMMA_LINK =/^\s*,\s*$/
const WORD_AFTER_OR = /^\s*(?:\/|\bor\b)\s*([A-Za-z][A-Za-z0-9+#]*)/i
const WORD_BEFORE_OR = /([A-Za-z][A-Za-z0-9+#]*)\s*(?:\/|\bor\b)\s*$/i

export function requirementTerms(requirement: string): Operand[][] {
  let spans: Span[]=termSpans(requirement).map((s) => ({ operand: { term: s.term }, start: s.start, end: s.end }))
  const extra=new Map<number, Operand[]>()
  if (spans.length)  {
    const inSpan = (at: number) => spans.some((s) => at >= s.start && at < s.end)
    spans.forEach((s,  i) => {
      const words: Operand[] = []
      const after = WORD_AFTER_OR.exec(requirement.slice(s.end))
      if ( after) {
        const at = s.end + after[0].length - after[1].length  
        if (!inSpan(at) && !FILLER.has(after[1].toLowerCase())) words.push({ word: after[1] })
      }
      const before = WORD_BEFORE_OR.exec( requirement.slice(0, s.start))
     if (before && !inSpan(before.index) && !FILLER.has(before[1].toLowerCase())) words.push({ word: before[1] })
      if (words.length) extra.set(i,words)
    })
   } else {
    spans = [...requirement.matchAll(/[A-Za-z][A-Za-z0-9]+/g)]
      .filter((m) => m[0].length > 2 && !FILLER.has(m[0].toLowerCase()))
      .map((m) => ({ operand: { word: m[0] },  start: m.index,  end: m.index + m[0].length }))
 }

  const links = spans.slice(1).map((s, i) => {  
    const between = requirement.slice(spans[i].end, s.start)
    return OR_LINK.test(between) ? "or" : AND_LINK.test(between) ? "and" : COMMA_LINK.test(between) ? "comma" : null
  })
  const groups: Operand[][] = []    
  let run: number[] = [0]
 const close = () => {



    const kinds = run.slice( 1).map((i) => links[i - 1])


    const oneSet = kinds.includes("or") && !kinds.includes("and")
    run.forEach((i, n) => {
      const ops = [spans[i].operand,...(extra.get(i) ?? [])] 
        if (n > 0 && (oneSet || kinds[n - 1] === "or")) groups[groups.length - 1].push(...ops)
      else groups.push(ops)
  }) 
  }
  if (!spans.length) return []
     links.forEach((link,i) => {
     if (link) run.push(i + 1)
    else {
      close()
    run = [i + 1]
    }
  })
  close()
  const seen = new Set<string>()
  return groups.filter((g) => {
    const key = g.map((o) => ("term" in o ? `t:${o.term}` : `w:${o.word.toLowerCase()}`)).sort().join("|")
    return !seen.has(key) && !!seen.add(key)
	  })
}

export function support(requirement: string, evidence: string[]): Support {  
  return supportDetail(requirement, evidence).support 
}

export function supportDetail( requirement: string, evidence: string[]): { support: Support; shown: string[]; missing: string[] } {
  const groups = requirementTerms(requirement)
  if (!groups.length) return { support: "unknown", shown: [], missing: [] }
  const text=evidence.join("\n")


  const evidenceWords = tokens(text)
   const score = (o: Operand) => ("term" in o ? termScore(o.term, text) : evidenceWords.some((e) => sameWord(o.word.toLowerCase(), e)) ? 1 : 0)
  const scored = groups.map((g) => {
    const scores = g.map(score)
    const best  = Math.max(...scores)
    return { best, generic: g.every( generic), name: best > 0 ? label(g[scores.indexOf(best)]) : g.map(label).join(" or ") }
	  })
  const shown = scored.filter((g)  =>  g.best === 1).map((g) =>g.name)
  const missing = scored.filter((g) => g.best < 1).map((g) => (g.best > 0 ? `${g.name} (only partly)` : g.name))
  if (scored.every((g) => g.best === 1)) return { support: "full", shown, missing: [] }
  const counts = scored.every((g) => g.generic) ? scored : scored.filter((g) => !g.generic)
  return { support: counts.some((g) => g.best > 0) ? "partial" : "none", shown,  missing }
}

export function unsupportedTerms(sentence: string, evidence: string[]): string[] {
  const text = evidence.join("\n")
  return knownTermsIn(sentence).filter((t) => termScore(t, text) === 0)  



}

export interface PageEvidence {
  entries: { itemId: string; text: string }[]  
     lines: { id: string; itemId: string; text: string; factIds: string[] }[]
}

type Line =  PageEvidence["lines"][number]  
export type Shown =  
  | { state: "covered" | "partial"; itemIds: string[]; line?: Line; shown?: string[]; missing?: string[] }
  | {state: "cut"; itemIds: string[]}
  | { state: "lines_cut"; itemIds: string[] }
  | { state: "elsewhere"; itemIds: string[] }
  | { state: "missing"}

export function requirementOnPage(r: { status: string; item_ids: string[]; text: string }, page: PageEvidence): Shown {  
  const cited = page.entries.filter( (e)=>r.item_ids.includes(e.itemId)).map((e) =>e.itemId)    
  const evidence =(ids: string[]) => [...page.lines.filter((l) => ids.includes(l.itemId)).map((l) => l.text), ...page.entries.filter((e) => ids.includes(e.itemId)).map((e) => e.text)] 
  const lineFor = (ids: string[]) => {
    const lines =page.lines.filter((l) => ids.includes(l.itemId))  
  return lines.find((l) => support(r.text, [l.text]) === "full") ?? lines.find((l) => support(r.text, [l.text]) === "partial") ?? lines[0]
  }
  const absent=(): Shown =>
  r.status === "elsewhere" && !cited.length ? { state: "elsewhere",  itemIds: r.item_ids }
    : cited.length ? { state: "lines_cut", itemIds: cited }
    : r.status === "not_found" || !r.item_ids.length ? { state: "missing" }
    : { state: "cut", itemIds: r.item_ids}

  if ( supportDetail(r.text, []).support === "unknown") {
    if (r.status === "not_found" || !cited.length) return absent( )
    return { state: "partial", itemIds: cited, line: lineFor( cited) } 
  }

  const each = page.entries.map((e) => ({ id: e.itemId, ...supportDetail(r.text, evidence([e.itemId])) }))
  const together =cited.length ? supportDetail( r.text,evidence(cited)) : null
  if (together?.support === "full") return {state: "covered",  itemIds: cited, line: lineFor(cited) }
   const alone = each.find((e) => e.support === "full")
 if (alone) return {state: "covered", itemIds: [alone.id], line: lineFor( [alone.id]) }
  const helping= each.filter((e) => e.support === "partial").map((e) => e.id)
const all  = helping.length > 1 ? supportDetail( r.text, evidence(helping)) : null
  if (all?.support === "full") return { state: "covered",itemIds: helping, line: lineFor(helping) }
 const part  = together?.support === "partial" ? { ...together, ids: cited } : helping.length ? { ...each.find((e) => e.support === "partial")!, ids: [each.find((e) => e.support === "partial")!.id] } : null
  if (part) return { state: "partial", itemIds: part.ids, line: lineFor(part.ids), shown: part.shown, missing: part.missing }
 return absent()    
   }

export function printedText(type: string, entry: { title: string; subtitle: string; tech: string[] }) {
  const parts =type === "project" || type === "award" ? [entry.title, ...entry.tech] : [entry.title, entry.subtitle]
  return parts.filter(Boolean).join(", ") 
}

export function pageEvidence(doc: Pick<ResumeDoc, "sections">, bulletFacts: Record<string, string[]>): PageEvidence {
  const entries =doc.sections.flatMap((s) => s.entries.map((e) => ({ type: s.type, e })))
	  return {
    entries: entries.map(({ type,e }) => ({ itemId: e.item_id, text: printedText(type, e) })),
      lines: entries.flatMap(({ e })=> e.bullets.map((b)=> ({ id: b.id, itemId: e.item_id, text: b.text, factIds: bulletFacts[b.id] ?? [] }))),

  }
   } 

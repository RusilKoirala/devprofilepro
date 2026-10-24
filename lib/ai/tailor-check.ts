import type { ModelPlan, TailorPlan } from "@/lib/ai/tailor"
import { support, unsupportedTerms, type Support } from "@/lib/record/evidence"
import { itemTitle, type Fact, type Item } from "@/lib/record/types"

// Plain-code checks on a tailoring plan. A known item id is not enough: the evidence cited for an
// item has to be that item's own facts, coverage has to rest on items that are on the resume, and
// the cited facts have to actually name what the requirement asks for.

// Saved with every match report. Reports from before these checks (no version) are shown as such.
export const MATCH_REPORT_VERSION = 2

// Names a summary could use to refer to an item ("Stripe", "PulseOps").
function names(item: Pick<Item, "type" | "data">): string[] {
  const d = item.data
  const list = item.type === "job" ? [d.company] : item.type === "project" || item.type === "award" ? [d.name] : []
  return list.filter((n): n is string => !!n && n.trim().length >= 4).map((n) => n.trim().toLowerCase())
}

function mentions(text: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, "i").test(text)
}

// Unselected items the summary names (unless a selected item shares the name).
function strayMentions(plan: { items: { item_id: string }[]; summary: string }, items: Item[]): string[] {
  const chosen = new Set(plan.items.map((i) => i.item_id))
  const chosenNames = items.filter((i) => chosen.has(i.id)).flatMap(names)
  return items
    .filter((i) => !chosen.has(i.id))
    .flatMap(names)
    .filter((n) => !chosenNames.some((c) => c.includes(n) || n.includes(c)) && mentions(plan.summary, n))
}

export function checkTailorPlan(plan: ModelPlan, items: Item[], facts: Fact[]): string[] {
  const ids = new Set(items.map((i) => i.id))
  const factItem = new Map(facts.map((f) => [f.id, f.item_id]))
  const chosen = new Set(plan.items.map((i) => i.item_id))
  const errors: string[] = []
  for (const i of plan.items) {
    if (!ids.has(i.item_id)) {
      errors.push(`Unknown item_id ${i.item_id}`)
      continue
    }
    if (!i.fact_ids.length) errors.push(`Item ${i.item_id}: cite the facts behind its reason`)
    for (const f of i.fact_ids) {
      if (!factItem.has(f)) errors.push(`Item ${i.item_id} cites unknown fact ${f}`)
      else if (factItem.get(f) !== i.item_id) errors.push(`Item ${i.item_id}'s reason cites fact ${f}, which belongs to item ${factItem.get(f)}. Describe each item from its own facts.`)
    }
  }
  for (const r of plan.requirements) {
    if (r.status !== "not_found" && !r.fact_ids.length) errors.push(`Requirement "${r.text}" is ${r.status} but cites no facts`)
    for (const f of r.fact_ids) {
      if (!factItem.has(f)) errors.push(`Requirement "${r.text}" cites unknown fact ${f}`)
      else if (r.status !== "elsewhere" && !chosen.has(factItem.get(f)!)) errors.push(`Requirement "${r.text}" cites fact ${f} from item ${factItem.get(f)}, which isn't included. Include that item, or mark the requirement "elsewhere".`)
    }
  }
  for (const n of strayMentions(plan, items)) errors.push(`The summary names "${n}", which isn't included`)
  if (!plan.items.length) errors.push("Include at least one item")
  return errors
}

// The text an entry contributes as evidence besides its facts: its tech, skills and headings.
function itemText(item: Item) {
  const d = item.data
  return [d.name, d.role, d.company, d.degree, d.details, d.category, ...(d.tech ?? []), ...(d.skills ?? [])].filter(Boolean).join(", ")
}

const RANK: Record<Support, number> = { full: 2, partial: 1, unknown: 0, none: 0 }

type Requirement = TailorPlan["requirements"][number]

// Every requirement is checked against the whole record, not only what the AI cited:
//   covered    the cited (or found) facts on the resume name everything it asks for
//   unclear    they name part of it, or only a weaker form (a Dockerfile for Docker)
//   elsewhere  the record shows it, but in entries this resume doesn't include
//   not_found  nothing in the record names it
// A requirement code can't check ("Strong communication") keeps the AI's call, at most "unclear".
export function assessRequirements(requirements: ModelPlan["requirements"], chosen: Set<string>, items: Item[], facts: Fact[]): Requirement[] {
  const byId = new Map(items.map((i) => [i.id, i]))
  const factById = new Map(facts.filter((f) => byId.has(f.item_id)).map((f) => [f.id, f]))
  const evidence = (fs: Fact[]) => [...fs.map((f) => f.text), ...[...new Set(fs.map((f) => f.item_id))].map((id) => itemText(byId.get(id)!))]
  const result = (text: string, status: Requirement["status"], fs: Fact[]): Requirement => ({ text, status, item_ids: [...new Set(fs.map((f) => f.item_id))], fact_ids: fs.map((f) => f.id) })
  // The facts in these entries that name some of what the requirement asks for, best first.
  const search = (text: string, inChosen: boolean) =>
    facts
      .filter((f) => byId.has(f.item_id) && chosen.has(f.item_id) === inChosen)
      .map((f) => ({ f, s: support(text, [f.text, itemText(byId.get(f.item_id)!)]) }))
      .filter((x) => x.s === "full" || x.s === "partial")
      .sort((a, b) => RANK[b.s] - RANK[a.s] || byId.get(b.f.item_id)!.rank - byId.get(a.f.item_id)!.rank)
      .map((x) => x.f)

  return requirements.slice(0, 10).map((r) => {
    const cited = r.fact_ids.map((id) => factById.get(id)).filter((f): f is Fact => !!f && chosen.has(f.item_id))
    if (support(r.text, []) === "unknown") {
      // Nothing code can check: the AI's call stands on its cited facts, but never as "covered".
      return r.status === "not_found" || !cited.length ? result(r.text, "not_found", []) : result(r.text, "unclear", cited)
    }
    if (r.status === "covered" && support(r.text, evidence(cited)) === "full") return result(r.text, "covered", cited)

    // What the AI cited, plus anything else on the resume that names the requirement.
    const onResume = [...new Map([...cited, ...search(r.text, true)].map((f) => [f.id, f])).values()].slice(0, 4)
    const here = onResume.length ? support(r.text, evidence(onResume)) : "none"
    if (here === "full") return result(r.text, r.status === "unclear" ? "unclear" : "covered", onResume)

    const elsewhere = search(r.text, false)
    const better = elsewhere.length && RANK[support(r.text, evidence(elsewhere.slice(0, 4)))] > RANK[here]
    if (here === "partial" && !better) return result(r.text, "unclear", onResume)
    if (elsewhere.length) {
      // The two strongest entries it shows up in, so the person can add one.
      const entries = [...new Set(elsewhere.map((f) => f.item_id))].slice(0, 2)
      return result(r.text, "elsewhere", elsewhere.filter((f) => entries.includes(f.item_id)).slice(0, 4))
    }
    return result(r.text, "not_found", [])
  })
}

// An entry's explanation stays only when its cited facts are its own and name every skill or tool
// it mentions. Remarks about the entry's status ("hidden but relevant") are taken out.
function checkedReason(reason: string, item: Item, own: Fact[]): string {
  const text = reason.replace(/\s*\([^)]*\b(hidden|shown|suggested|status)\b[^)]*\)\s*/gi, " ").trim()
  if (!text || !own.length || /\b(hidden|is shown)\b/i.test(text)) return ""
  return unsupportedTerms(text, [...own.map((f) => f.text), itemText(item)]).length ? "" : text
}

const KEPT: Partial<Record<Item["type"], string>> = {
  education: "Kept on every resume: education always stays.",
  skills: "Kept: your strongest skills group.",
}

// Keep only evidence that checks out. Education and one skills group are always kept when they
// exist, in code rather than by asking.
export function repairTailorPlan(plan: ModelPlan, items: Item[], facts: Fact[]): TailorPlan {
  const byId = new Map(items.map((i) => [i.id, i]))
  const factById = new Map(facts.map((f) => [f.id, f]))
  const seen = new Set<string>()
  const picked = plan.items
    .filter((i) => byId.has(i.item_id) && !seen.has(i.item_id) && seen.add(i.item_id))
    .map((i) => {
      const own = i.fact_ids.map((f) => factById.get(f)).filter((f): f is Fact => f?.item_id === i.item_id)
      // A reason built on another item's facts describes the wrong thing, so it goes.
      const borrowed = i.fact_ids.some((f) => factById.has(f) && factById.get(f)!.item_id !== i.item_id)
      return { item_id: i.item_id, reason: borrowed ? "" : checkedReason(i.reason, byId.get(i.item_id)!, own), fact_ids: own.map((f) => f.id) }
    })
  const hasType = (t: string) => picked.some((i) => byId.get(i.item_id)!.type === t)
  const visible = items.filter((i) => i.status !== "hidden")
  if (!hasType("education")) for (const e of visible.filter((i) => i.type === "education")) picked.push({ item_id: e.id, reason: KEPT.education!, fact_ids: [] })
  if (!hasType("skills")) {
    const skills = visible.filter((i) => i.type === "skills").sort((a, b) => b.rank - a.rank)[0]
    if (skills) picked.push({ item_id: skills.id, reason: KEPT.skills!, fact_ids: [] })
  }

  const chosen = new Set(picked.map((i) => i.item_id))
  const requirements = assessRequirements(plan.requirements, chosen, items, facts)
  return { title: plan.title, company: plan.company, role: plan.role, items: picked, section_order: plan.section_order, requirements, summary: checkedSummary(plan.summary, picked, items) }
}

// The AI's summary, unless it names an entry that isn't on the resume.
function checkedSummary(summary: string, picked: { item_id: string }[], items: Item[]) {
  const byId = new Map(items.map((i) => [i.id, i]))
  if (!strayMentions({ items: picked, summary }, items).length) return summary
  return `Chose ${picked.length} entr${picked.length === 1 ? "y" : "ies"} for this: ${picked.slice(0, 4).map((i) => itemTitle(byId.get(i.item_id)!)).join("; ")}${picked.length > 4 ? "; and more" : ""}.`
}

// A match report for a resume that already exists: the AI's fresh read of the job post, checked
// against the entries this resume actually includes. Used to re-check reports made before these checks.
export function reportForResume(plan: ModelPlan, include: string[], items: Item[], facts: Fact[]) {
  const byId = new Map(items.map((i) => [i.id, i]))
  const factById = new Map(facts.map((f) => [f.id, f]))
  const chosen = new Set(include.filter((id) => byId.has(id)))
  const reasons = plan.items
    .filter((i) => chosen.has(i.item_id))
    .map((i) => {
      const own = i.fact_ids.map((f) => factById.get(f)).filter((f): f is Fact => f?.item_id === i.item_id)
      return { item_id: i.item_id, reason: checkedReason(i.reason, byId.get(i.item_id)!, own), fact_ids: own.map((f) => f.id) }
    })
  const picked = [...chosen].map((item_id) => ({ item_id }))
  return {
    version: MATCH_REPORT_VERSION,
    summary: checkedSummary(plan.summary, picked, items),
    reasons,
    requirements: assessRequirements(plan.requirements, chosen, items, facts),
  }
}

interface StoredReport {
  reasons?: { item_id: string; reason: string; fact_ids?: string[] }[]
  requirements?: { item_ids?: string[] }[]
  [key: string]: unknown
}

// After two entries are merged, a saved report that cited the dropped one cites the kept one.
// Facts keep their ids when they move, so fact citations need no change. Returns null when the
// report doesn't mention the dropped entry.
export function remapReport<T extends StoredReport>(report: T, dropId: string, keepId: string): T | null {
  const cites = report.reasons?.some((r) => r.item_id === dropId) || report.requirements?.some((r) => r.item_ids?.includes(dropId))
  if (!cites) return null
  const reasons = new Map<string, NonNullable<StoredReport["reasons"]>[number]>()
  for (const r of report.reasons ?? []) {
    const id = r.item_id === dropId ? keepId : r.item_id
    const prev = reasons.get(id)
    reasons.set(id, prev ? { ...prev, reason: prev.reason || r.reason, fact_ids: [...new Set([...(prev.fact_ids ?? []), ...(r.fact_ids ?? [])])] } : { ...r, item_id: id })
  }
  return {
    ...report,
    reasons: [...reasons.values()],
    requirements: report.requirements?.map((r) => ({ ...r, item_ids: r.item_ids && [...new Set(r.item_ids.map((id) => (id === dropId ? keepId : id)))] })),
  }
}

import type { ModelPlan, TailorPlan } from "@/lib/ai/tailor"
import { support, unsupportedTerms, type Support } from "@/lib/record/evidence"
import {itemTitle,type Fact,type Item} from "@/lib/record/types"

export const MATCH_REPORT_VERSION= 4

const VERDICT = /\b(no evidence|not (?:recorded|found|shown|mentioned|listed)|nothing in (?:the|your) record|(?:isn't|is not|aren't|are not) (?:recorded|in (?:the|your) record))\b/i

export function requirementText(text: string): string {
  const m= VERDICT.exec(text)

  if (!m) return text.trim()
  const head = text.slice(0,m.index)
  // cut at the last dash/bracket, good enough
  const cut = Math.max(...[" — ", " – ", " - ", "(", ";", ":"].map((s) =>head.lastIndexOf(s)))
  return (cut >= 0 ? head.slice(0,  cut) : head).replace(/[\s, :;—–-]+$/, "").trim( ) || text.trim()
}

 const REQUIREMENT_CLAIM=/\b(requirements?|no evidence|not (?:recorded|found|shown|mentioned|listed)|(?:isn't|aren't|doesn't|don't) (?:show|cover|mention|appear|recorded)|missing|lacks?|gaps?|cover(?:s|ed|ing)?)\b/i

export function withoutRequirementClaims(summary: string): string {    
  return summary.split(/(?<=[.!?])\s+/).filter((s) => s.trim() && !REQUIREMENT_CLAIM.test(s)).join(" ").trim()
}

function names(item: Pick<Item, "type" | "data">): string[] { 
  const d =  item.data
  const list  = item.type === "job" ? [d.company] : item.type === "project" || item.type === "award" ? [d.name] : []
  return list.filter((n): n is string=> !!n && n.trim().length >= 4).map((n)=>n.trim().toLowerCase()) 
}

 function mentions(text: string, name: string) {
	  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, "i").test(text)
}

function strayMentions(plan: { items: { item_id: string }[]; summary: string }, items: Item[]): string[] {
const chosen = new Set(plan.items.map((i) => i.item_id))
  const chosenNames = items.filter((i) => chosen.has(i.id)).flatMap(names)
  return items 
  .filter( (i) => !chosen.has(i.id)) 
    .flatMap(names) 
    .filter( (n) => !chosenNames.some((c) => c.includes(n) || n.includes(c)) && mentions(plan.summary,n))
}

	export function checkTailorPlan(plan: ModelPlan, items: Item[], facts: Fact[]): string[] {
  const ids = new Set(items.map((i)=>i.id))
   const factItem=new Map( facts.map((f) => [f.id, f.item_id]))
  const listed = [...plan.items, ...( plan.backup_items ?? [])]
  const chosen= new Set(listed.map((i) => i.item_id))
 const errors: string[]= []
  for (const i of listed) {
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
    if (requirementText(r.text) !== r.text.trim()) errors.push(`Requirement "${r.text}": give only the requirement as the post states it. Its status already says whether the record shows it.`)
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

function itemText(item: Item) {
	  const d =  item.data
  const printed =  
      item.type === "project" || item.type === "award" ? [d.name, ...( d.tech ?? [])]
    : item.type === "job" ? [d.role, d.company]
    : item.type === "education" ? [d.school, d.degree,  d.details]
    : item.type === "skills" ? [d.category, ...(d.skills ?? [])]
    : []
    return printed.filter(Boolean).join(", ") 
}

	const RANK: Record<Support, number> = { full: 2, partial: 1, unknown: 0, none: 0 }    

type Requirement = TailorPlan["requirements"][number]

export function assessRequirements(requirements: ModelPlan["requirements"],chosen: Set<string>, items: Item[], facts: Fact[]): Requirement[] {
 const byId= new Map(items.map((i) => [i.id, i]))
     const factById = new Map(facts.filter((f) => byId.has(f.item_id)).map((f) => [f.id, f]))
 const evidence = (fs: Fact[]) => [...fs.map((f) => f.text), ...[...new Set(fs.map((f) => f.item_id))].map((id) => itemText(byId.get(id)!))]
const result = (text: string, status: Requirement["status"], fs: Fact[]): Requirement =>({ text, status, item_ids: [...new Set(fs.map((f) =>f.item_id))], fact_ids: fs.map((f)=> f.id) })
const search = (text: string, inChosen: boolean) =>
    facts
        .filter( (f) => byId.has(f.item_id) && chosen.has(f.item_id) === inChosen)    
      .map( (f) => ({ f, s: support(text, [f.text, itemText(byId.get(f.item_id)!)]) }))
        .filter( (x) => x.s === "full" || x.s === "partial")
      .sort((a,b) => RANK[b.s] - RANK[a.s] || byId.get(b.f.item_id)!.rank - byId.get(a.f.item_id)!.rank)
      .map( (x) => x.f)

  return requirements.slice(0, 10).map(({ text, ...rest }) => {
    const r = { ...rest, text: requirementText(text) }
    const cited =  r.fact_ids.map((id) => factById.get(id)).filter((f): f is Fact => !!f && chosen.has(f.item_id))
    if (support(r.text, []) === "unknown") {
      return r.status === "not_found" || !cited.length ? result( r.text, "not_found", []) : result(r.text, "unclear",cited)
   }
    if (r.status === "covered" && support(r.text, evidence(cited)) === "full") return result(r.text, "covered",  cited)

    const onResume= [...new Map([...cited, ...search(r.text, true)].map((f) => [f.id, f])).values()].slice(0, 4)
    const here = onResume.length ? support(r.text, evidence(onResume)) : "none" 
     if (here === "full") return result(r.text, r.status === "unclear" ? "unclear" : "covered", onResume)

    const elsewhere = search( r.text, false)
    const better = elsewhere.length && RANK[support(r.text, evidence(elsewhere.slice(0, 4)))] > RANK[here]
    if (here === "partial" && !better) return result(r.text, "unclear", onResume)
    if ( elsewhere.length) {
      const entries = [...new Set(elsewhere.map((f) => f.item_id))].slice(0,  2)
      return result(r.text, "elsewhere",  elsewhere.filter((f) => entries.includes(f.item_id)).slice(0,4))
  }


	    return result(r.text, "not_found", [])
  })
}

function checkedReason(reason: string, item: Item,own: Fact[]): string {
  const text = reason.replace( /\s*\([^)]*\b(hidden|shown|suggested|status)\b[^)]*\)\s*/gi, " ").trim()


if (!text || !own.length || /\b(hidden|is shown)\b/i.test(text)) return ""
  return unsupportedTerms(text, [...own.map((f)  =>  f.text),  itemText(item)]).length ? "" : text
  }

const KEPT: Partial<Record<Item["type"], string>> = {
  education: "Kept on every resume: education always stays.",
  skills: "Kept: your strongest skills group.",
}

export function repairTailorPlan(plan: ModelPlan, items: Item[], facts: Fact[]): TailorPlan {
  const byId= new Map(items.map((i) => [i.id,  i]))
 const factById =  new Map(facts.map((f) => [f.id, f]))
  const seen = new Set<string>() 
  const keep = ( list: ModelPlan["items"]) =>
      list 
      .filter((i) => byId.has(i.item_id) && !seen.has(i.item_id) && seen.add(i.item_id)) 
      .map((i) => {
           const own = i.fact_ids.map((f) => factById.get(f)).filter((f): f is Fact => f?.item_id === i.item_id)  
       const borrowed = i.fact_ids.some((f) => factById.has(f) && factById.get(f)!.item_id !== i.item_id)
       return {item_id: i.item_id, reason: borrowed ? "" : checkedReason(i.reason, byId.get(i.item_id)!, own),  fact_ids: own.map((f) => f.id) }
      })
  const picked = keep(plan.items)

   const hasType = (t: string) => picked.some((i) => byId.get(i.item_id)!.type === t) 
  const visible = items.filter((i) => i.status !== "hidden")
  if (!hasType("education")) for (const e of visible.filter((i)=>i.type === "education")) picked.push({ item_id: e.id, reason: KEPT.education!,  fact_ids: [] }) 
  if (!hasType("skills")) {
	    const skills =visible.filter((i) => i.type === "skills").sort((a, b) =>b.rank - a.rank)[0]
  if (skills) picked.push({ item_id: skills.id, reason: KEPT.skills!, fact_ids: [] })
}

const chosen = new Set(picked.map((i) => i.item_id))
  const requirements = assessRequirements(plan.requirements, chosen, items, facts)
  const backup = keep(plan.backup_items ?? []).filter((i) => byId.get(i.item_id)!.type === "job" || byId.get(i.item_id)!.type === "project").slice(0, 2)
  return { title: plan.title, company: plan.company,  role: plan.role,  items: picked, backup, section_order: plan.section_order,requirements, summary: checkedSummary(plan.summary, picked,items) }

}

export function checkedSummary(summary: string,  picked: { item_id: string }[],  items: Item[]){
  const byId =  new Map( items.map((i) => [i.id, i])) 
  const kept= withoutRequirementClaims(summary)
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim() && !strayMentions({ items: picked,summary: s },  items).length)
    .join(" ")
    .trim()
  if (kept) return kept
  return `Chose ${picked.length} entr${picked.length === 1 ? "y" : "ies"} for this: ${picked.slice(0, 4).map((i) => itemTitle(byId.get(i.item_id)!)).join("; ")}${picked.length > 4 ? "; and more" : ""}.`
}

export function reportForResume(plan: ModelPlan, include: string[], items: Item[], facts: Fact[]) {
    const byId = new Map( items.map((i) => [i.id, i]))

 const factById = new Map(facts.map((f)=>[f.id, f]))
  const chosen = new Set(include.filter((id) => byId.has(id)))  
  const reasons = plan.items
    .filter((i) => chosen.has(i.item_id))



    .map((i) => {  
      const own  = i.fact_ids.map((f) => factById.get(f)).filter((f): f is Fact => f?.item_id === i.item_id)
      return { item_id: i.item_id, reason: checkedReason(i.reason, byId.get(i.item_id)!, own), fact_ids: own.map((f) => f.id) }  
    })
  const picked=[...chosen].map((item_id) => ({item_id}))
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

export function remapReport<T extends StoredReport>(report: T, dropId: string, keepId: string): T | null {
  const cites  = report.reasons?.some( (r) => r.item_id === dropId) || report.requirements?.some((r) => r.item_ids?.includes(dropId))
  if (!cites) return null
 const reasons = new Map<string, NonNullable<StoredReport["reasons"]>[number]>()    
  for (const r of report.reasons ?? []) {
       const id =  r.item_id === dropId ? keepId : r.item_id
    const prev = reasons.get( id)
    reasons.set(id, prev ? { ...prev,  reason: prev.reason || r.reason,  fact_ids: [...new Set([...(prev.fact_ids ?? []),  ...(r.fact_ids ?? [])])] } : { ...r,item_id: id })
 }    
  return {
       ...report,
    reasons: [...reasons.values()],
   requirements: report.requirements?.map( (r)=>({...r, item_ids: r.item_ids && [...new Set(r.item_ids.map((id) => (id === dropId ? keepId : id)))]})),
  }
}

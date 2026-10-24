import type { ModelPlan, TailorPlan } from "@/lib/ai/tailor"
import { itemTitle, type Fact, type Item } from "@/lib/record/types"

// Plain-code checks on a tailoring plan. A known item id is not enough: the evidence cited for an
// item has to be that item's own facts, and coverage has to rest on items that are on the resume.

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
function strayMentions(plan: Pick<ModelPlan, "items" | "summary">, items: Item[]): string[] {
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
      else if (!chosen.has(factItem.get(f)!)) errors.push(`Requirement "${r.text}" cites fact ${f} from item ${factItem.get(f)}, which isn't included`)
    }
  }
  for (const n of strayMentions(plan, items)) errors.push(`The summary names "${n}", which isn't included`)
  if (!plan.items.length) errors.push("Include at least one item")
  return errors
}

// Keep only evidence that checks out. Education and one skills group are always kept when they
// exist, in code rather than by asking.
export function repairTailorPlan(plan: ModelPlan, items: Item[], facts: Fact[]): TailorPlan {
  const byId = new Map(items.map((i) => [i.id, i]))
  const factItem = new Map(facts.map((f) => [f.id, f.item_id]))
  const seen = new Set<string>()
  const picked = plan.items
    .filter((i) => byId.has(i.item_id) && !seen.has(i.item_id) && seen.add(i.item_id))
    .map((i) => {
      const own = i.fact_ids.filter((f) => factItem.get(f) === i.item_id)
      // A reason built on another item's facts describes the wrong thing, so it goes.
      const borrowed = i.fact_ids.some((f) => factItem.has(f) && factItem.get(f) !== i.item_id)
      return { item_id: i.item_id, reason: borrowed || !own.length ? "" : i.reason, fact_ids: own }
    })
  const hasType = (t: string) => picked.some((i) => byId.get(i.item_id)!.type === t)
  const visible = items.filter((i) => i.status !== "hidden")
  if (!hasType("education")) for (const e of visible.filter((i) => i.type === "education")) picked.push({ item_id: e.id, reason: "", fact_ids: [] })
  if (!hasType("skills")) {
    const skills = visible.filter((i) => i.type === "skills").sort((a, b) => b.rank - a.rank)[0]
    if (skills) picked.push({ item_id: skills.id, reason: "", fact_ids: [] })
  }

  const chosen = new Set(picked.map((i) => i.item_id))
  const requirements = plan.requirements.slice(0, 10).map((r) => {
    const fact_ids = r.fact_ids.filter((f) => chosen.has(factItem.get(f) ?? ""))
    const item_ids = [...new Set(fact_ids.map((f) => factItem.get(f)!))]
    // "Covered" with no evidence on the resume can't be shown as covered.
    const status = r.status !== "not_found" && !fact_ids.length ? ("unclear" as const) : r.status
    return { text: r.text, status, item_ids, fact_ids }
  })

  const stray = strayMentions({ items: picked, summary: plan.summary }, items)
  const summary = stray.length
    ? `Chose ${picked.length} entr${picked.length === 1 ? "y" : "ies"} for this: ${picked.slice(0, 4).map((i) => itemTitle(byId.get(i.item_id)!)).join(", ")}${picked.length > 4 ? ", and more" : ""}.`
    : plan.summary
  return { title: plan.title, company: plan.company, role: plan.role, items: picked, section_order: plan.section_order, requirements, summary }
}

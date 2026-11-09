import { hasTerm } from "@/lib/ats/keywords"
import { requirementTerms } from "@/lib/record/evidence"
import type { Bullet, Fact, Item, ResumeRow } from "@/lib/record/types"
import { headingOf, sameSkill } from "@/lib/resume/build"
import { resumeBullets } from "@/lib/resume/order"
import { thinLine } from "@/lib/resume/thin"

export type DropReason = "ownership" | "no_facts" | "thin"

export function tidyTailored(resume: Pick<ResumeRow, "id" | "layout">, items: Item[], bullets: Bullet[], facts: Fact[] = []) {
  const byId = new Map(items.map((i) => [i.id, i]))
  const hide: string[] = []
  const remove: string[] = []
  const drop: { id: string; reason: DropReason }[] = []
  for (const id of resume.layout.include ?? []) {
    const item = byId.get(id)
    if (!item || (item.type !== "job" && item.type !== "project")) continue
    const lines = resumeBullets(bullets, id, { id: resume.id, hidden_bullets: resume.layout.hidden_bullets, own_items: resume.layout.own_items })
    const thin = lines.filter((b) => !b.user_edited && thinLine(b.text, headingOf(item)))
    for (const b of thin) (b.resume_id ? remove : hide).push(b.id)
    if (lines.length > thin.length || item.pinned) continue
    const useful = facts.some((f) => f.item_id === id && !thinLine(f.text, headingOf(item)))
    drop.push({ id, reason: useful && item.data.team_project && !item.data.ownership_confirmed ? "ownership" : useful ? "thin" : "no_facts" })
  }
  return { hide, remove, drop }
}

export function dropMessage(title: string, reason: DropReason) {
  if (reason === "ownership") return `${title}: waiting for you to say which parts were yours. Answer its question in the editor and I'll write it up.`
  if (reason === "thin") return `${title}: its lines only repeated the heading or a link.`
  return `${title}: nothing recorded about what you did there.`
}

const NOT_LISTED = new Set(["APIs", "Testing", "Unit testing", "Performance", "Security", "Monitoring", "Accessibility", "Observability", "Microservices", "Serverless", "System design", "Distributed systems", "Agile", "Scrum", "Code review", "Data pipelines"])
const MAX_ADDED = 6

export function skillFocus(requirements: { text: string; status: string; fact_ids?: string[] }[], facts: Fact[], items: Item[], groups: Item[]): Record<string, string[]> {
  if (!groups.length) return {}
  const factById = new Map(facts.map((f) => [f.id, f]))
  const byId = new Map(items.map((i) => [i.id, i]))
  const wanted: string[] = []
  for (const r of requirements) {
    if (r.status !== "covered" && r.status !== "unclear") continue
    const cited = (r.fact_ids ?? []).map((id) => factById.get(id)).filter((f): f is Fact => !!f)
    const evidence = cited.flatMap((f) => [f.text, ...(byId.get(f.item_id)?.data.tech ?? [])])
    for (const group of requirementTerms(r.text))
      for (const o of group)
        if ("term" in o && !NOT_LISTED.has(o.term) && evidence.some((t) => hasTerm(t, o.term)) && !wanted.some((w) => sameSkill(w, o.term))) wanted.push(o.term)
  }
  const focus: Record<string, string[]> = {}
  const target = groups.find((g) => /tool|framework|librar|tech|stack/i.test(g.data.category ?? "")) ?? groups[0]
  let added = 0
  for (const term of wanted) {
    const home = groups.find((g) => (g.data.skills ?? []).some((s) => sameSkill(s, term)))
    if (home) (focus[home.id] ??= []).push((home.data.skills ?? []).find((s) => sameSkill(s, term))!)
    else if (added++ < MAX_ADDED) (focus[target.id] ??= []).push(term)
  }
  return focus
}

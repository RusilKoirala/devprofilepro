// AI quality evals (docs/IMPLEMENTATION.md section 8.5). Runs A1 → quote check → A2 → A3 on each
// fixture with no database. Calls the real Claude API, so it costs money: run it when a prompt or
// the model changes, and don't ship a change that raises the drop or reject rate.
//
//   npm run eval                 all fixtures
//   npm run eval -- team         fixtures whose file name contains "team"
//   npm run eval -- --dry-run    validate fixtures without calling Claude

import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { extractRecord } from "@/lib/ai/extract"
import { generateQuestions } from "@/lib/ai/questions"
import { checkBullet, writeBullets } from "@/lib/ai/write"
import { draftTailorPlan } from "@/lib/ai/tailor"
import { checkTailorPlan, repairTailorPlan } from "@/lib/ai/tailor-check"
import { hasTerm } from "@/lib/ats/keywords"
import { support } from "@/lib/record/evidence"
import { bannedWordsIn, groundItemData, verifyFacts } from "@/lib/record/verify"
import { itemTitle, type Fact, type Item, type ItemType, type SourceRow } from "@/lib/record/types"

interface Fixture {
  name: string
  sources: Omit<SourceRow, "url" | "status" | "fetched_at">[]
  // Tailoring evals start from a saved Career Record instead of sources.
  tailor?: {
    brief: string
    items: Pick<Item, "id" | "type" | "data" | "rank" | "status">[]
    facts: { id: string; item_id: string; text: string }[]
    expect: { include?: string[]; requirement_from?: Record<string, string[]> }
  }
  expect: {
    no_item_types?: ItemType[]
    item_types?: ItemType[]
    projects_before_jobs?: boolean
    shown?: string[]
    hidden?: string[]
    team_project?: string[]
    question_kinds?: string[]
    dates_verbatim?: string[]
    must_not_mention?: string[]
  }
}

const args = process.argv.slice(2)
const dryRun = args.includes("--dry-run")
const filter = args.find((a) => !a.startsWith("--"))
const dir = join(process.cwd(), "evals/fixtures")
const files = readdirSync(dir).filter((f) => f.endsWith(".json") && (!filter || f.includes(filter)))

let failures = 0
for (const file of files) {
  const fx = JSON.parse(readFileSync(join(dir, file), "utf8")) as Fixture
  console.log(`\n▶ ${fx.name} (${file})`)
  if (fx.tailor) {
    if (dryRun) console.log(`  ${fx.tailor.items.length} items, ${fx.tailor.facts.length} facts, ${Object.keys(fx.tailor.expect).length} expectations`)
    else failures += await tailorEval(fx.tailor)
    continue
  }
  if (dryRun) {
    console.log(`  ${fx.sources.length} sources, ${Object.keys(fx.expect).length} expectations`)
    continue
  }

  const sources: SourceRow[] = fx.sources.map((s) => ({ ...s, url: null, status: "ok", fetched_at: new Date().toISOString() }))
  const raw = new Map(sources.map((s) => [s.id, s.raw_text]))
  const { output } = await extractRecord("eval", sources)

  // Turn the extract output into an in-memory record, the same way the pipeline saves it.
  const items: Item[] = []
  const facts: Fact[] = []
  let dropped = 0
  let total = 0
  for (const [n, x] of output.items.entries()) {
    const id = `item-${n}`
    const v = verifyFacts(x.facts, raw)
    const sourceTexts = [...new Set(v.kept.map((f) => f.source_id))].map((sid) => raw.get(sid)!)
    items.push({ id, type: x.type, data: { ...groundItemData(x.data, sourceTexts), team_project: x.team_project }, rank: x.rank, status: x.show ? "shown" : "hidden", reason: x.reason, pinned: false })
    total += x.facts.length
    dropped += v.dropped.length
    v.kept.forEach((f, i) => facts.push({ id: `${id}-f${i}`, item_id: id, text: f.text, label: "document", source_id: f.source_id, quote: f.quote, approx: false }))
  }

  const [questions, written] = await Promise.all([
    generateQuestions("eval", items, facts),
    writeBullets({ userId: "eval", items: items.filter((i) => i.status !== "hidden"), facts }),
  ])
  const factsByItem = new Map<string, Map<string, Fact>>()
  for (const f of facts) factsByItem.set(f.item_id, (factsByItem.get(f.item_id) ?? new Map()).set(f.id, f))
  const rejected = written.bullets.filter((b) => checkBullet(b, factsByItem.get(b.item_id) ?? new Map()).length).length

  // Expectations
  const results: [string, boolean][] = []
  const e = fx.expect
  const types = new Set(items.map((i) => i.type))
  const allText = [...written.bullets.map((b) => b.text), written.headline, ...items.map((i) => JSON.stringify(i.data))].join("\n").toLowerCase()
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "")
  const find = (name: string) => items.find((i) => norm(itemTitle(i)).includes(norm(name)))
  for (const t of e.no_item_types ?? []) results.push([`no ${t} items`, !types.has(t)])
  for (const t of e.item_types ?? []) results.push([`has ${t} items`, types.has(t)])
  if (e.projects_before_jobs) {
    const order = output.section_order
    results.push(["projects before jobs", !order.includes("job") || order.indexOf("project") < order.indexOf("job")])
  }
  // Says what happened when it isn't the expected state: a different status, or no such item.
  const state = (n: string) => find(n)?.status ?? "not extracted (omitted or renamed)"
  for (const n of e.shown ?? []) results.push([`"${n}" shown${state(n) === "shown" ? "" : ` · was ${state(n)}`}`, state(n) === "shown"])
  for (const n of e.hidden ?? []) results.push([`"${n}" hidden (not deleted)${state(n) === "hidden" ? "" : ` · was ${state(n)}`}`, state(n) === "hidden"])
  for (const n of e.team_project ?? []) {
    const x = output.items.find((i) => norm(itemTitle({ type: i.type, data: i.data })).includes(norm(n)))
    results.push([`"${n}" marked as team project`, !!x?.team_project])
  }
  if (e.question_kinds) results.push([`asks a ${e.question_kinds.join("/")} question`, questions.some((q) => e.question_kinds!.includes(q.kind))])
  for (const d of e.dates_verbatim ?? []) results.push([`date "${d}" kept verbatim`, items.some((i) => i.data.start === d || i.data.end === d)])
  for (const w of e.must_not_mention ?? []) results.push([`never says "${w}"`, !allText.includes(w.toLowerCase())])
  const needBullets = items.filter((i) => i.status !== "hidden" && (i.type === "job" || i.type === "project") && !i.data.team_project && facts.some((f) => f.item_id === i.id))
  results.push(["every shown job/project has bullets", needBullets.every((i) => written.bullets.some((b) => b.item_id === i.id))])
  results.push(["no banned words", written.bullets.every((b) => !bannedWordsIn(b.text).length)])
  results.push(["at most 5 questions", questions.length <= 5])

  console.log(`  facts: ${total - dropped}/${total} kept by quote check (${total ? Math.round((dropped / total) * 100) : 0}% dropped)`)
  console.log(`  bullets: ${written.bullets.length} written, ${written.fallbacks} fell back to fact text, ${rejected} still failing checks`)
  console.log(`  questions: ${questions.map((q) => `[${q.kind}] ${q.prompt}`).join(" | ") || "none"}`)
  for (const [label, ok] of results) {
    console.log(`  ${ok ? "✓" : "✗"} ${label}`)
    if (!ok) failures++
  }
}

// The model's own plan, before code repairs it: every reason and covered requirement must cite
// facts of the item it names, and the summary must name only what was chosen.
async function tailorEval(t: NonNullable<Fixture["tailor"]>): Promise<number> {
  const items: Item[] = t.items.map((i) => ({ ...i, reason: null, pinned: false }))
  const facts: Fact[] = t.facts.map((f) => ({ ...f, label: "document", source_id: "s", quote: f.text, approx: false }))
  const usable = items.filter((i) => i.type !== "contact")
  const plan = await draftTailorPlan("eval", t.brief, usable, facts, [])
  const errors = checkTailorPlan(plan, usable, facts)
  const factItem = new Map(facts.map((f) => [f.id, f.item_id]))
  const chosen = new Set(plan.items.map((i) => i.item_id))
  const results: [string, boolean][] = [["no evidence cited on the wrong item, no stray names", errors.length === 0]]
  for (const id of t.expect.include ?? []) results.push([`includes ${id}`, chosen.has(id)])
  // Only the cited facts that name the term are judged: a compound "Go and Node.js" requirement may
  // rightly cite a Node.js fact from another item for its other half.
  const factText = new Map(facts.map((f) => [f.id, f.text]))
  for (const [term, allowed] of Object.entries(t.expect.requirement_from ?? {})) {
    const reqs = plan.requirements.filter((r) => hasTerm(r.text, term) && r.status !== "not_found")
    const naming = reqs.flatMap((r) => r.fact_ids.filter((f) => hasTerm(factText.get(f) ?? "", term)))
    results.push([`"${term}" evidence comes only from ${allowed.join("/")}`, naming.length > 0 && naming.every((f) => allowed.includes(factItem.get(f) ?? ""))])
  }

  // Measured, not pass/fail: claims the cited facts don't support (false positives) and requirements
  // called missing that the record does show (false negatives), before and after code repair.
  const measure = (reqs: { text: string; status: string; fact_ids: string[] }[]) => ({
    falsePositives: reqs.filter((r) => r.status === "covered" && support(r.text, r.fact_ids.map((f) => factText.get(f) ?? "")) === "none").length,
    falseNegatives: reqs.filter((r) => r.status === "not_found" && facts.some((f) => support(r.text, [f.text]) === "full")).length,
  })
  const before = measure(plan.requirements)
  const after = measure(repairTailorPlan(plan, usable, facts).requirements)
  console.log(`  unsupported claims: ${before.falsePositives} → ${after.falsePositives} after repair · missed evidence: ${before.falseNegatives} → ${after.falseNegatives}`)
  console.log(`  picked: ${plan.items.map((i) => i.item_id).join(", ")}`)
  for (const e of errors.slice(0, 5)) console.log(`  ! ${e}`)
  let failed = 0
  for (const [label, ok] of results) {
    console.log(`  ${ok ? "✓" : "✗"} ${label}`)
    if (!ok) failed++
  }
  return failed
}

console.log(failures ? `\n${failures} expectation(s) failed` : "\nAll expectations passed")
process.exitCode = failures ? 1 : 0

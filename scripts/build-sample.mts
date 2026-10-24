// Builds the landing page's student sample by running the real pipeline on an eval fixture, so
// the page shows actual output rather than copy written to look good. Calls the configured AI
// provider (a few cents). Re-run when prompts or models change:
//
//   npx tsx --env-file=.env.local --require ./evals/stub-server-only.cjs scripts/build-sample.mts
//
// Writes components/marketing/student-sample.json and public/samples/student-resume.pdf.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { extractRecord } from "@/lib/ai/extract"
import { generateInterview } from "@/lib/ai/interview"
import { aiProvider, modelFor } from "@/lib/ai/model"
import { writeBullets } from "@/lib/ai/write"
import { defaultLayout } from "@/lib/record/pipeline"
import { groundItemData, verifyFacts } from "@/lib/record/verify"
import { itemTitle, type Bullet, type Fact, type Item, type SourceRow } from "@/lib/record/types"
import { buildResume } from "@/lib/resume/build"
import { pageCount, renderPdf } from "@/lib/resume/render"

const FIXTURE = "evals/fixtures/github-only-student.json"
// The one answer the sample gives, written as a student plausibly would. Shown as an example answer.
const ANSWER = "SM-2 review scheduling and the CSV import. About 40 classmates used it before the CS 314 final."

const started = Date.now()
const fx = JSON.parse(readFileSync(join(process.cwd(), FIXTURE), "utf8")) as { name: string; sources: Omit<SourceRow, "url" | "status" | "fetched_at">[] }
const sources: SourceRow[] = fx.sources.map((s) => ({ ...s, url: null, status: "ok", fetched_at: new Date().toISOString() }))
const raw = new Map(sources.map((s) => [s.id, s.raw_text]))

// ② Extract + ③ quote check, the same way the pipeline saves them.
const { output } = await extractRecord("sample", sources)
const items: Item[] = []
const facts: Fact[] = []
let dropped = 0
for (const [n, x] of output.items.entries()) {
  const id = `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`
  const v = verifyFacts(x.facts, raw)
  dropped += v.dropped.length
  if (!v.kept.length) continue
  const texts = [...new Set(v.kept.map((f) => f.source_id))].map((sid) => raw.get(sid)!)
  items.push({ id, type: x.type, data: { ...groundItemData(x.data, texts), team_project: x.team_project }, rank: x.rank, status: x.show ? "shown" : "hidden", reason: x.reason, pinned: false })
  v.kept.forEach((f, i) => facts.push({ id: `${id.slice(0, -4)}${String(i).padStart(4, "0")}`, item_id: id, text: f.text, label: "github", source_id: f.source_id, quote: f.quote, approx: false }))
}
const shown = items.filter((i) => i.status !== "hidden")

// ④ The interview and ⑤ the first draft.
const [questions, draft] = await Promise.all([generateInterview("sample", items, facts, []), writeBullets({ userId: "sample", items: shown, facts })])
const target = shown.filter((i) => i.type === "project").sort((a, b) => b.rank - a.rank)[0]
const question = questions.find((q) => q.item_id === target.id) ?? questions[0]

// One answer becomes a "You told us" fact, and only that entry is rewritten.
const answerFact: Fact = { id: `${target.id.slice(0, -4)}9999`, item_id: target.id, text: `${question.prompt.replace(/\?$/, "")}: ${ANSWER}`, label: "user", source_id: null, quote: null, approx: false }
const rewritten = await writeBullets({ userId: "sample", items: [target], facts: [...facts, answerFact] })
const seconds = Math.round((Date.now() - started) / 1000)

// The final page, rendered with the real template.
const bullets: Bullet[] = [...draft.bullets.filter((b) => b.item_id !== target.id), ...rewritten.bullets].map((b, n) => ({ id: `b${n}`, ...b, user_edited: false }))
const doc = buildResume(defaultLayout({ items, bullets }, draft.headline), { items, bullets })
const pdf = await renderPdf(doc)
mkdirSync("public/samples", { recursive: true })
writeFileSync("public/samples/student-resume.pdf", pdf)

const lines = (bs: { item_id: string; text: string }[], id: string) => bs.filter((b) => b.item_id === id).map((b) => b.text)
const sample = {
  generated: new Date().toISOString().slice(0, 10),
  model: aiProvider() ? modelFor(aiProvider()!) : "unknown",
  seconds,
  pages: await pageCount(pdf),
  sources: fx.sources.filter((s) => s.kind === "github").map((s) => ({ label: s.label.replace(/^GitHub (repo|profile): /, ""), summary: s.raw_text.split("\n").find((l) => l.startsWith("Description:") || l.startsWith("Bio:"))?.replace(/^(Description|Bio): /, "") ?? "" })),
  factsKept: facts.length,
  factsDropped: dropped,
  hidden: items.filter((i) => i.status === "hidden").map((i) => ({ title: itemTitle(i), reason: i.reason ?? "" })),
  draft: shown.filter((i) => i.type === "project").map((i) => ({ title: itemTitle(i), lines: lines(draft.bullets, i.id) })),
  question: { entry: itemTitle(target), prompt: question.prompt, options: question.options, answer: ANSWER },
  after: { title: itemTitle(target), before: lines(draft.bullets, target.id), lines: lines(rewritten.bullets, target.id) },
}
writeFileSync("components/marketing/student-sample.json", `${JSON.stringify(sample, null, 2)}\n`)
console.log(JSON.stringify(sample, null, 2))

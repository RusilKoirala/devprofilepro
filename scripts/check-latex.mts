// Checks that the .tex download fits on one page whenever the PDF does (audit F26). The PDF is
// fitted with React PDF; this compiles the LaTeX for the same fitted documents and counts pages.
// Needs Tectonic (brew install tectonic). Run:
//
//   npx tsx --require ./evals/stub-server-only.cjs scripts/check-latex.mts
import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { Bullet, Item } from "@/lib/record/types"
import { buildResume } from "@/lib/resume/build"
import { fitToOnePage } from "@/lib/resume/fit"
import { toLatex } from "@/lib/resume/latex"
import { pageCount } from "@/lib/resume/render"
import type { ResumeLayout } from "@/lib/record/types"

const contact: Item = { id: "c", type: "contact", data: { name: "Sam Thapa", email: "sam@example.com", phone: "+977 980 000 0000", location: "Kathmandu, Nepal", github: "https://github.com/samt", linkedin: "https://linkedin.com/in/samt", website: "https://samt.dev" }, rank: 100, status: "shown", reason: null, pinned: false }

// A record with `jobs` jobs and `projects` projects, `lines` bullets each, of realistic length.
function record(jobs: number, projects: number, lines: number) {
  const items: Item[] = [contact]
  const bullets: Bullet[] = []
  const add = (item: Item) => {
    items.push(item)
    for (let n = 0; n < lines; n++) bullets.push({ id: `${item.id}-${n}`, item_id: item.id, text: `Built feature ${n + 1} of ${item.data.name ?? item.data.company} with TypeScript and PostgreSQL, adding tests and cutting load time for the team's users.`, fact_ids: ["f"], user_edited: false })
  }
  for (let j = 0; j < jobs; j++) add({ id: `j${j}`, type: "job", data: { role: "Software Engineer", company: `Company ${j + 1}`, location: "Remote", start: `Jan ${2024 - j}`, end: j ? `Dec ${2024 - j}` : "Present" }, rank: 80 - j, status: "shown", reason: null, pinned: false })
  for (let p = 0; p < projects; p++) add({ id: `p${p}`, type: "project", data: { name: `project-${p + 1}`, url: `https://github.com/samt/project-${p + 1}`, tech: ["Go", "Docker", "PostgreSQL"] }, rank: 60 - p, status: "shown", reason: null, pinned: false })
  items.push({ id: "e", type: "education", data: { school: "Tribhuvan University", degree: "BSc Computer Science", details: "GPA 3.8", location: "Kathmandu", start: "2022", end: "2026" }, rank: 50, status: "shown", reason: null, pinned: false })
  items.push({ id: "s", type: "skills", data: { category: "Languages", skills: ["Go", "TypeScript", "Python", "SQL", "Rust"] }, rank: 50, status: "shown", reason: null, pinned: false })
  items.push({ id: "t", type: "skills", data: { category: "Tools", skills: ["Docker", "PostgreSQL", "Kubernetes", "Git", "Linux"] }, rank: 50, status: "shown", reason: null, pinned: false })
  const layout: ResumeLayout = { headline: "Software Engineer", section_order: ["job", "project", "education", "skills"], items: items.filter((i) => i.type !== "contact").map((i) => ({ item_id: i.id, bullet_ids: bullets.filter((b) => b.item_id === i.id).map((b) => b.id) })) }
  return { items, bullets, layout }
}

const CASES: [string, number, number, number][] = [
  ["student, sparse", 0, 3, 2],
  ["typical", 2, 3, 3],
  ["dense, cut to fit", 4, 5, 5],
  ["very dense, cut to fit", 6, 8, 6],
]

const dir = mkdtempSync(join(tmpdir(), "latex-check-"))
let failures = 0
for (const [name, jobs, projects, lines] of CASES) {
  const r = record(jobs, projects, lines)
  const fit = await fitToOnePage(r.layout, r)
  const tex = join(dir, `${name.replace(/\W+/g, "-")}.tex`)
  writeFileSync(tex, toLatex(buildResume(fit.layout, r)))
  execFileSync("tectonic", ["--keep-logs", "--outdir", dir, tex], { stdio: "pipe" })
  const texPages = await pageCount(new Uint8Array(readFileSync(tex.replace(/\.tex$/, ".pdf"))))
  const ok = fit.pages === 1 && texPages === 1
  if (!ok) failures++
  console.log(`${ok ? "✓" : "✗"} ${name}: PDF ${fit.pages} page, LaTeX ${texPages} page${texPages === 1 ? "" : "s"} (${fit.cuts.length} cuts)`)
}
console.log(failures ? `\n${failures} case(s) where the .tex doesn't fit on one page` : "\nThe .tex fits on one page whenever the PDF does")
process.exitCode = failures ? 1 : 0

import assert from "node:assert/strict"
import { test } from "node:test"
import { analyzeResume, looksTwoColumn, type ExtractedPdf, type PdfLine } from "./analyze.ts"
import { matchKeywords, mentions } from "./keywords.ts"

const line = (text: string, x = 0.08): PdfLine => ({ page: 1, xs: [x], runs: [text] })

const GOOD = [
  "Maya Chen",
  "maya@example.com | +1 415 555 0134 | github.com/mayachen",
  "Experience",
  "Software Engineering Intern, Acme Jun 2025 – Aug 2025",
  "• Built a billing page with React and Stripe used by 2,000 customers",
  "• Cut API response time 40% by adding Redis caching",
  "• Wrote 120 Playwright tests that run on every pull request",
  "• Shipped OAuth sign-in for 3 partner apps",
  "Projects",
  "Expense Tracker Jan 2024 – Mar 2024",
  "• Designed a FastAPI service with PostgreSQL for 300 users",
  "Education",
  "BSc Computer Science, Tribhuvan University Sep 2022 – Present",
  "Skills",
  "TypeScript, React, Node.js, PostgreSQL, Docker, AWS",
]
const filler = " Built and shipped features with TypeScript and React for real users every week."

function pdf(lines: string[], extra: Partial<ExtractedPdf> = {}): ExtractedPdf {
  const text = lines.join("\n") + filler.repeat(20)
  return { pages: 1, text, lines: lines.map((l) => line(l)), links: [], ...extra }
}

test("a clean single-column resume passes every check", () => {
  const report = analyzeResume(pdf(GOOD))
  assert.equal(report.verdict, "pass")
  assert.deepEqual(report.checks.filter((c) => c.status !== "pass").map((c) => c.id), [])
  assert.equal(report.score, 100)
})

test("a scanned image fails on unreadable text and stops there", () => {
  const report = analyzeResume({ pages: 1, text: "  ", lines: [], links: [] })
  assert.equal(report.verdict, "fail")
  assert.deepEqual(report.checks.map((c) => [c.id, c.status]), [["text", "fail"]])
})

test("missing email and headings fail as missing information, not as an unreadable file", () => {
  const lines = ["Maya Chen", " +1 415 555 0134  ", "My Journey", "Intern, Acme 06/2025 – Aug 2025", "Toolbox", "React"]
  const report = analyzeResume(pdf(lines))
  assert.equal(report.verdict, "pass")
  assert.deepEqual(report.missingInfo, ["contact details", "standard section headings"])
  const status = Object.fromEntries(report.checks.map((c) => [c.id, c.status]))
  assert.equal(status.contact, "fail")
  assert.equal(status.sections, "fail")
  assert.equal(status.glyphs, "warn")
  assert.equal(status.dates, "warn")
})

test("two columns are detected, but right-aligned dates are not mistaken for one", () => {
  const twoCol = Array.from({ length: 10 }, (_, i): PdfLine => ({ page: 1, xs: [0.06, 0.55], runs: [`Left column line ${i} text`, `Right column skill ${i}`] }))
  assert.ok(looksTwoColumn(twoCol))
  // Columns whose rows don't line up: two left margins.
  const unaligned = Array.from({ length: 14 }, (_, i): PdfLine => ({ page: 1, xs: [i % 2 ? 0.55 : 0.06], runs: [`Column text line number ${i}`] }))
  assert.ok(looksTwoColumn(unaligned))
  const dates = Array.from({ length: 10 }, (_, i): PdfLine => ({ page: 1, xs: [0.06, 0.8], runs: [`Software Engineer at Company ${i}`, "Jun 2024 – Present"] }))
  assert.ok(!looksTwoColumn(dates))
})

test("weak openers and missing numbers are flagged on content", () => {
  const lines = [...GOOD.slice(0, 3), "• Responsible for the backend", "• Worked on the frontend", "• Helped the team", "• Made various improvements", ...GOOD.slice(8)]
  const content = analyzeResume(pdf(lines)).checks.find((c) => c.id === "content")!
  assert.equal(content.status, "warn")
  assert.match(content.detail, /Responsible for/)
})

test("keyword match finds tools across spellings and lists what's missing", () => {
  assert.ok(mentions("Worked with Node.js and C++", "Node.js") && mentions("Worked with C++", "C++"))
  assert.ok(!mentions("Javascript", "Java"))
  assert.ok(mentions("Built an API for billing", "APIs"))
  const post = "We're hiring a backend engineer. You'll use Python, FastAPI, PostgreSQL and Kafka on AWS. Experience with Kubernetes and Kafka streams is a plus. Snowflake and Snowflake pipelines."
  const m = matchKeywords(post, "Built FastAPI services in Python with PostgreSQL on AWS")!
  assert.deepEqual(m.missing.sort(), ["Kafka", "Kubernetes", "Snowflake"])
  assert.equal(m.found.length, 4)
  assert.equal(matchKeywords("too short", "anything"), null)
})

test("short but selectable text is read, not called a scanned image", () => {
  const text = "Alex Example alex@example.com github.com/alex Experience Built APIs with Go. Education Example University Skills Go"
  const report = analyzeResume({ pages: 1, text, lines: text.split(". ").map((t) => line(t)), links: [] })
  assert.equal(report.verdict, "pass")
  assert.equal(report.checks.find((c) => c.id === "text")?.status, "warn")
})

test("Go is recognised as a language, and aliases count for the canonical name", () => {
  const post = "Backend role. You will build services in Go, work with Postgres and Docker, and design APIs. Go to market is a bonus."
  const match = matchKeywords(post, "Built a REST API in Golang with PostgreSQL and Docker")!
  assert.ok(match.found.includes("Go"))
  assert.ok(match.found.includes("PostgreSQL"))
  assert.deepEqual(match.missing, [])
  assert.equal(matchKeywords("Join us and go beyond what you thought possible. We use React and TypeScript every day for our users.", "React")!.found.includes("Go"), false)
})

import assert from "node:assert/strict"
import { test } from "node:test"
import { requirementOnPage, requirementTerms, support, unsupportedTerms, type PageEvidence } from "./evidence.ts"

test("support needs the evidence to name what the requirement asks for", () => {
  assert.equal(support("Production Kubernetes operations", ["Built a JavaScript landing page."]), "none")
  assert.equal(support("Experience with PostgreSQL database", ["Tech used: express, postgres, react"]), "full")
  assert.equal(support("Experience deploying applications", ["Deployed the Student API live at https://example.app"]), "full")
  assert.equal(support("Experience with automated testing", ["Wrote unit tests for the parser"]), "full")
})

test("compound requirements and weaker forms are partial, not covered", () => {
  assert.equal(support("Build payment APIs in Go and Node.js", ["Go service with a REST API"]), "partial")
  assert.equal(support("Build payment APIs in Go and Node.js", ["Go service with a REST API", "Node.js payments worker"]), "full")
  assert.equal(support("Experience with Docker or containerization", ["Uses Dockerfile in student-api project"]), "partial")
  assert.equal(support("Experience with Docker or containerization", ["Ships with Docker Compose"]), "full")
})

test("a requirement with nothing checkable is unknown, not covered", () => {
  assert.equal(support("Strong experience", ["anything"]), "unknown")
})

test("an explanation naming a skill its facts never mention is caught", () => {
  assert.deepEqual(unsupportedTerms("Has production Kubernetes expertise.", ["Built a JavaScript landing page."]), ["Kubernetes"])
  assert.deepEqual(unsupportedTerms("Go API with a Dockerfile", ["Built with JavaScript, Go, CSS, Dockerfile", "Student API"]), [])
})

const page = (lines: PageEvidence["lines"]): PageEvidence => ({ entries: [{ itemId: "api", text: "Example API, JavaScript" }], lines })
const goLine = { id: "b-go", itemId: "api", text: "Wrote the Go services behind the API", factIds: ["f-go"] }
const jsLine = { id: "b-js", itemId: "api", text: "Built a JavaScript landing page", factIds: ["f-js"] }
const goReq = { text: "Go services", status: "covered", item_ids: ["api"], fact_ids: ["f-go"] }

test("coverage follows the supporting line, not the entry", () => {
  assert.equal(requirementOnPage(goReq, page([goLine, jsLine])).state, "covered")
  // The audit's case: the Go line is cut, an unrelated JavaScript line of the same project remains.
  assert.equal(requirementOnPage(goReq, page([jsLine])).state, "lines_cut")
  assert.equal(requirementOnPage(goReq, { entries: [], lines: [] }).state, "cut")
})

test("the supporting line is the one offered as evidence", () => {
  const shown = requirementOnPage(goReq, page([goLine, jsLine]))
  assert.ok(shown.state === "covered" && shown.line?.id === "b-go")
})

test("an entry from elsewhere in the record counts once it's on the page", () => {
  const req = { text: "PostgreSQL", status: "elsewhere", item_ids: ["pulse"], fact_ids: ["f-pg"] }
  assert.equal(requirementOnPage(req, page([])).state, "elsewhere")
  const added: PageEvidence = { entries: [{ itemId: "pulse", text: "PulseOps, express, postgres" }], lines: [] }
  assert.equal(requirementOnPage(req, added).state, "covered")
})

test("only what the templates print counts: tech stored on a skills group or job doesn't", async () => {
  const { pageEvidence } = await import("./evidence.ts")
  const entry = (item_id: string, title: string, subtitle: string, tech: string[]) => ({ item_id, title, subtitle, tech, location: "", dates: "", url: "", bullets: [] })
  const page = pageEvidence({
    sections: [
      { type: "skills", title: "Skills", entries: [entry("sk", "Languages", "JavaScript, Go", ["PostgreSQL", "Docker"])] },
      { type: "job", title: "Experience", entries: [entry("job", "Developer", "Acme", ["Kubernetes"])] },
      { type: "project", title: "Projects", entries: [entry("pulse", "PulseOps", "", ["Express", "Postgres"])] },
    ],
  }, {})
  const req = (text: string, item: string) => requirementOnPage({ text, status: "covered", item_ids: [item] }, page)
  // The audit's case: "shown by Skills" although the printed Skills list has neither. PostgreSQL is
  // printed by PulseOps, so that's what shows it.
  assert.deepEqual(req("Experience with PostgreSQL", "sk"), { state: "covered", itemIds: ["pulse"], line: undefined })
  assert.equal(req("Docker", "sk").state, "lines_cut")
  assert.equal(req("Kubernetes", "job").state, "lines_cut")
  assert.equal(req("Go", "sk").state, "covered")
  assert.equal(req("Experience with PostgreSQL", "pulse").state, "covered")
})

// The 2026-10-25 audit: a generic API line was a green check for LLM integration, because any
// "or" or "/" made every term in the requirement optional.
const genericApi = ["Implemented responsive user interfaces and robust backend APIs optimized for client operational needs using Node.js and Go"]

test("generic API evidence doesn't show an LLM or OpenAI/Anthropic requirement, even partly", () => {
  assert.equal(support("Experience with LLM/AI APIs (preferred)", genericApi), "none")
  assert.equal(support("Experience with LLM APIs", genericApi), "none")
  assert.equal(support("OpenAI or Anthropic LLM API integration", genericApi), "none")
  assert.equal(support("Integrate OpenAI or Anthropic LLM APIs", genericApi), "none")
  assert.equal(support("OpenAI or Anthropic LLM API integration", ["Built an Anthropic LLM API integration for support replies"]), "full")
  assert.equal(support("Experience with LLM/AI APIs", ["Called AI APIs to summarize tickets"]), "full")
})

test("only operands joined by or or / are alternatives", () => {
  const names = (r: string) => requirementTerms(r).map((g) => g.map((o) => ("term" in o ? o.term : o.word)))
  assert.deepEqual(names("Experience with LLM/AI APIs"), [["LLM", "AI"], ["APIs"]])
  assert.deepEqual(names("OpenAI or Anthropic LLM API integration"), [["OpenAI", "Anthropic"], ["LLM"], ["APIs"]])
  assert.deepEqual(names("Python, Go, or Java"), [["Python", "Go", "Java"]])
  assert.deepEqual(names("Go and Node.js"), [["Go"], ["Node.js"]])
  assert.deepEqual(names("REST/GraphQL APIs"), [["REST", "GraphQL"], ["APIs"]])
  assert.deepEqual(names("CI/CD pipelines"), [["CI/CD"]])
  assert.deepEqual(names("Experience deploying or operating services"), [["deploying", "operating"], ["services"]])
})

test("a list of choices is shown by any one of them", () => {
  assert.equal(support("Python, Go, or Java", ["Wrote the Go services behind the API"]), "full")
  assert.equal(support("REST/GraphQL APIs", ["Built a GraphQL API for the dashboard"]), "full")
})

test("plain-word requirements need every part unless they're offered as choices", () => {
  assert.equal(support("Automated integration tests", genericApi), "none")
  assert.equal(support("Experience deploying or operating services", ["Deployed three services on Fly.io"]), "full")
  assert.equal(support("Experience deploying or operating services", ["Deployed the landing page"]), "partial")
})

// The 2026-10-25 retest: shared everyday words were partial evidence, and an edit that kept the
// words lost the match because the report's cited facts had gone stale.
test("words almost any work shares aren't partial evidence on their own", () => {
  const responsive = ["Built responsive interfaces and full-stack web applications with Node.js and Go for clients in Nepal, India, and Australia."]
  const installer = ["Authored cross-platform installer fix adding ARM architecture support (Apple Silicon/AArch64) for Conda automated setups"]
  assert.equal(support("Accessible keyboard-friendly interfaces", responsive), "none")
  assert.equal(support("Frontend automated tests", installer), "none")
  assert.equal(support("Write automated integration tests", installer), "none")
  assert.equal(support("Write automated integration tests", ["Wrote automated integration tests for the billing API"]), "full")
  assert.equal(support("Accessible keyboard-friendly interfaces", ["Added keyboard navigation and screen reader labels to the dashboard for accessibility"]), "partial")
})

test("a partial match says what it shows and what it doesn't", async () => {
  const { supportDetail } = await import("./evidence.ts")
  assert.deepEqual(supportDetail("Build payment APIs in Go and Node.js", ["Go service with a REST API"]), { support: "partial", shown: ["APIs", "Go"], missing: ["Node.js"] })
})

test("an edit that keeps the words keeps the match, whatever facts the report cited", () => {
  const edited: PageEvidence = {
    entries: [{ itemId: "free", text: "Web Application Developer, Freelance" }],
    lines: [{ id: "b-new", itemId: "free", text: "Built Node.js and Go web applications for clients across Nepal, India, and Australia", factIds: ["f-you-told-us"] }],
  }
  const shown = requirementOnPage({ text: "Node.js or Go", status: "covered", item_ids: ["free"] }, edited)
  assert.ok(shown.state === "covered" && shown.line?.id === "b-new")
})

test("a line added since the report counts, wherever it is", () => {
  const added: PageEvidence = { entries: [{ itemId: "api", text: "Student API, Go" }], lines: [{ id: "b", itemId: "api", text: "Added Docker builds for the Go service", factIds: [] }] }
  assert.equal(requirementOnPage({ text: "Docker", status: "not_found", item_ids: [] }, added).state, "covered")
})

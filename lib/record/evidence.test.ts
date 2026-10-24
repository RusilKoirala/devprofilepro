import assert from "node:assert/strict"
import { test } from "node:test"
import { requirementOnPage, support, unsupportedTerms, type PageEvidence } from "./evidence.ts"

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
  assert.equal(requirementOnPage(goReq, page([goLine, jsLine]), false).state, "covered")
  // The audit's case: the Go line is cut, an unrelated JavaScript line of the same project remains.
  assert.equal(requirementOnPage(goReq, page([jsLine]), false).state, "lines_cut")
  assert.equal(requirementOnPage(goReq, { entries: [], lines: [] }, false).state, "cut")
})

test("the supporting line is the one offered as evidence", () => {
  const shown = requirementOnPage(goReq, page([goLine, jsLine]), false)
  assert.ok(shown.state === "covered" && shown.line?.id === "b-go")
})

test("an entry from elsewhere in the record counts once it's on the page", () => {
  const req = { text: "PostgreSQL", status: "elsewhere", item_ids: ["pulse"], fact_ids: ["f-pg"] }
  assert.equal(requirementOnPage(req, page([]), false).state, "elsewhere")
  const added: PageEvidence = { entries: [{ itemId: "pulse", text: "PulseOps, express, postgres" }], lines: [] }
  assert.equal(requirementOnPage(req, added, false).state, "covered")
})

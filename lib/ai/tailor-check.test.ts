import assert from "node:assert/strict"
import { test } from "node:test"
import { checkTailorPlan, remapReport, repairTailorPlan, reportForResume } from "./tailor-check.ts"
import type { ModelPlan } from "./tailor.ts"
import type { Fact, Item } from "@/lib/record/types"

const item = (id: string, type: Item["type"], data: Item["data"], status: Item["status"] = "shown"): Item => ({ id, type, data, rank: 50, status, reason: null, pinned: false })
const fact = (id: string, item_id: string, text: string): Fact => ({ id, item_id, text, label: "document", source_id: "s", quote: text, approx: false })

// The first audit's failure: Student API explained with PulseOps' facts, and the summary naming PulseOps.
const items = [
  item("api", "project", { name: "Student API" }),
  item("pulse", "project", { name: "PulseOps", tech: ["express", "postgres"] }),
  item("edu", "education", { school: "Example University" }),
  item("sk", "skills", { category: "Languages", skills: ["Go"] }),
]
const facts = [
  fact("f-api", "api", "Go service with a Dockerfile"),
  fact("f-deploy", "api", "Deployed the Student API live at https://student-api.example.app"),
  fact("f-pulse", "pulse", "Express and Postgres uptime monitoring"),
]
const plan: ModelPlan = {
  title: "Backend", company: null, role: "Backend engineer",
  items: [{ item_id: "api", reason: "Uptime monitoring with Express and Postgres", fact_ids: ["f-pulse"] }],
  section_order: ["project"],
  requirements: [{ text: "Postgres", status: "covered", fact_ids: ["f-pulse"] }],
  summary: "Included PulseOps and your API work.",
}

test("evidence from another item, coverage from an unselected item and a stray summary name are all caught", () => {
  const errors = checkTailorPlan(plan, items, facts)
  assert.ok(errors.some((e) => e.includes("belongs to item pulse")))
  assert.ok(errors.some((e) => e.includes("isn't included") && e.includes("Postgres")))
  assert.ok(errors.some((e) => e.includes('summary names "pulseops"')))
})

test("repair drops borrowed reasons, points to evidence elsewhere and keeps education and skills", () => {
  const out = repairTailorPlan(plan, items, facts)
  assert.equal(out.items.find((i) => i.item_id === "api")!.reason, "")
  assert.deepEqual(out.requirements[0], { text: "Postgres", status: "elsewhere", item_ids: ["pulse"], fact_ids: ["f-pulse"] })
  assert.ok(out.items.find((i) => i.item_id === "edu")!.reason.startsWith("Kept"))
  assert.ok(out.items.some((i) => i.item_id === "sk"))
  assert.ok(!/pulseops/i.test(out.summary))
})

const backend: ModelPlan = {
  title: "Backend", company: null, role: null,
  items: [{ item_id: "api", reason: "(Education item hidden but relevant) Go service", fact_ids: ["f-api"] }],
  section_order: ["project"],
  requirements: [
    { text: "Experience deploying applications", status: "not_found", fact_ids: [] },
    { text: "Experience with PostgreSQL database", status: "not_found", fact_ids: [] },
    { text: "Experience with Docker or containerization", status: "not_found", fact_ids: [] },
    { text: "Experience with Rust", status: "not_found", fact_ids: [] },
  ],
  summary: "Picked Student API.",
}

test("the whole record is searched before a requirement is called missing", () => {
  const [deploy, pg, docker, rust] = repairTailorPlan(backend, items, facts).requirements
  assert.equal(deploy.status, "covered")
  assert.deepEqual(deploy.fact_ids, ["f-deploy"])
  assert.equal(pg.status, "elsewhere")
  assert.deepEqual(pg.item_ids, ["pulse"])
  assert.equal(docker.status, "unclear")
  assert.equal(rust.status, "not_found")
})

test("status remarks are taken out of explanations", () => {
  assert.equal(repairTailorPlan(backend, items, facts).items[0].reason, "Go service")
})

test("a correctly owned fact that doesn't name the skill can't cover it", () => {
  const its = [item("project", "project", { name: "Example API" })]
  const fs = [fact("f", "project", "Built a JavaScript landing page.")]
  const adversarial: ModelPlan = {
    title: "Example", company: null, role: null,
    items: [{ item_id: "project", reason: "Has production Kubernetes expertise.", fact_ids: ["f"] }],
    section_order: ["project"],
    requirements: [{ text: "Production Kubernetes operations", status: "covered", fact_ids: ["f"] }],
    summary: "Selected Example API.",
  }
  // Ownership checks still pass: the fact is the item's own...
  assert.deepEqual(checkTailorPlan(adversarial, its, fs), [])
  // ...but neither the claim nor the explanation survives repair.
  const out = repairTailorPlan(adversarial, its, fs)
  assert.equal(out.requirements[0].status, "not_found")
  assert.equal(out.items[0].reason, "")
})

test("a re-checked report is versioned and judged against the resume's own entries", () => {
  const report = reportForResume({ ...backend, items: [...backend.items, { item_id: "pulse", reason: "Postgres monitoring", fact_ids: ["f-pulse"] }] }, ["api", "edu"], items, facts)
  assert.equal(report.version, 3)
  assert.ok(!report.reasons.some((r) => r.item_id === "pulse"))
  assert.equal(report.requirements[1].status, "elsewhere")
})

test("merging entries moves report citations onto the kept entry", () => {
  const report = { summary: "", reasons: [{ item_id: "keep", reason: "" , fact_ids: ["a"] }, { item_id: "drop", reason: "Go API", fact_ids: ["b"] }], requirements: [{ text: "Go", item_ids: ["drop", "keep"] }] }
  const out = remapReport(report, "drop", "keep")!
  assert.deepEqual(out.reasons, [{ item_id: "keep", reason: "Go API", fact_ids: ["a", "b"] }])
  assert.deepEqual(out.requirements[0].item_ids, ["keep"])
  assert.equal(remapReport(report, "other", "keep"), null)
})

// The 2026-10-25 audit: "OpenAI or Anthropic LLM API integration — no evidence anywhere in the
// record" was a green check against a generic API line, and the summary said the opposite.
test("a requirement's verdict is cut from its text, and generic API work doesn't cover LLM integration", async () => {
  const { requirementText } = await import("./tailor-check.ts")
  assert.equal(requirementText("OpenAI or Anthropic LLM API integration — no evidence anywhere in the record"), "OpenAI or Anthropic LLM API integration")
  assert.equal(requirementText("Automated integration tests (not recorded in the record)"), "Automated integration tests")
  assert.equal(requirementText("Experience with REST APIs"), "Experience with REST APIs")

  const audit = [item("web", "job", { role: "Web Application Developer", company: "Freelance" }), item("sk", "skills", { category: "Languages", skills: ["Go"] })]
  const auditFacts = [fact("f-web", "web", "Implemented responsive user interfaces and robust backend APIs optimized for client operational needs using Node.js and Go")]
  const llm: ModelPlan = {
    title: "Example Labs — Backend Engineer", company: "Example Labs", role: "Backend Engineer",
    items: [{ item_id: "web", reason: "Backend APIs with Node.js and Go", fact_ids: ["f-web"] }],
    section_order: ["job"],
    requirements: [{ text: "OpenAI or Anthropic LLM API integration — no evidence anywhere in the record", status: "covered", fact_ids: ["f-web"] }],
    summary: "Leads with your freelance backend work. LLM integrations are not recorded anywhere in your record.",
  }
  assert.ok(checkTailorPlan(llm, audit, auditFacts).some((e) => e.includes("give only the requirement")))
  const out = repairTailorPlan(llm, audit, auditFacts)
  assert.equal(out.requirements[0].text, "OpenAI or Anthropic LLM API integration")
  assert.notEqual(out.requirements[0].status, "covered")
  assert.equal(out.summary, "Leads with your freelance backend work.")
})

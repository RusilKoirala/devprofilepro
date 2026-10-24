import assert from "node:assert/strict"
import { test } from "node:test"
import { checkTailorPlan, repairTailorPlan } from "./tailor-check.ts"
import type { ModelPlan } from "./tailor.ts"
import type { Fact, Item } from "@/lib/record/types"

const item = (id: string, type: Item["type"], data: Item["data"]): Item => ({ id, type, data, rank: 50, status: "shown", reason: null, pinned: false })
const fact = (id: string, item_id: string, text: string): Fact => ({ id, item_id, text, label: "document", source_id: "s", quote: text, approx: false })

// The audit's failure: Student API explained with PulseOps' facts, and the summary naming PulseOps.
const items = [
  item("api", "project", { name: "Student API" }),
  item("pulse", "project", { name: "PulseOps" }),
  item("edu", "education", { school: "Example University" }),
  item("sk", "skills", { category: "Languages", skills: ["Go"] }),
]
const facts = [fact("f-api", "api", "Go service with a Dockerfile"), fact("f-pulse", "pulse", "Express and Postgres uptime monitoring")]
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

test("repair drops borrowed reasons, downgrades unsupported coverage and keeps education and skills", () => {
  const out = repairTailorPlan(plan, items, facts)
  assert.equal(out.items.find((i) => i.item_id === "api")!.reason, "")
  assert.deepEqual(out.requirements[0], { text: "Postgres", status: "unclear", item_ids: [], fact_ids: [] })
  assert.ok(out.items.some((i) => i.item_id === "edu"))
  assert.ok(out.items.some((i) => i.item_id === "sk"))
  assert.ok(!/pulseops/i.test(out.summary))
})

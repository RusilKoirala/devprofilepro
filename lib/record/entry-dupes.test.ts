import assert from "node:assert/strict"
import { test } from "node:test"
import { findDuplicateEntries, similarName } from "./entry-dupes.ts"
import type { Item } from "./types.ts"

const item = (id: string, type: Item["type"], data: Item["data"]): Item => ({ id, type, data, rank: 50, status: "shown", reason: null, pinned: false })

test("employer spellings that are the same company match; different companies don't", () => {
  assert.ok(similarName("Layer5", "Layer5, Inc."))
  assert.ok(similarName("Layer5", "Layer5 (Meshery)"))
  assert.ok(!similarName("Acme", "Acme Bank Holdings Group"))
  assert.ok(!similarName("Stripe", "Shopify"))
})

test("the audit's cases: one freelance period under two titles, one employer under two names", () => {
  const pairs = findDuplicateEntries([
    item("f1", "job", { role: "Web Application Developer", company: "Freelance", start: "Jan 2023", end: "Present" }),
    item("f2", "job", { role: "Full Stack Developer", company: "Self-employed", start: "Jan 2023", end: "Present" }),
    item("l1", "job", { role: "Open Source Contributor", company: "Layer5", start: "Jun 2024", end: "Aug 2024" }),
    item("l2", "job", { role: "Contributor", company: "Layer5, Inc.", start: "Jul 2024", end: "Aug 2024" }),
    item("x", "job", { role: "Intern", company: "Layer5", start: "Jan 2020", end: "Mar 2020" }),
  ])
  assert.deepEqual(pairs.map((p) => [p.a, p.b]), [["f1", "f2"], ["l1", "l2"]])
})

test("entries the person called different are not suggested again", () => {
  const items = [
    item("a", "project", { name: "PulseOps", distinct_from: ["b"] }),
    item("b", "project", { name: "pulseops" }),
  ]
  assert.deepEqual(findDuplicateEntries(items), [])
})

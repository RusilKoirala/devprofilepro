import assert from "node:assert/strict"
import { test } from "node:test"
import { findDuplicateFacts, sameFact } from "./dedupe.ts"

test("rewordings of one fact are duplicates; different numbers never are", () => {
  assert.ok(sameFact("Secondary Education Examination (SEE), graduated 2025, GPA 3.86 / 4.00", "Graduated Secondary Education Examination (SEE) in 2025 with GPA 3.86/4.00"))
  assert.ok(sameFact("High school grades 11-12, graduation expected in 2027", "Attending High School (Grades 11–12) with Expected Graduation 2027"))
  assert.ok(!sameFact("GPA 3.86 / 4.00", "GPA 3.9 / 4.00"))
  assert.ok(!sameFact("Built the billing page with Stripe", "Built the login page with NextAuth"))
})

test("duplicates merge into the cited fact, within one entry only", () => {
  const facts = [
    { id: "a", item_id: "e1", text: "Graduated SEE in 2025 with GPA 3.86/4.00" },
    { id: "b", item_id: "e1", text: "SEE, graduated 2025, GPA 3.86 / 4.00" },
    { id: "c", item_id: "e2", text: "SEE, graduated 2025, GPA 3.86 / 4.00" },
  ]
  assert.deepEqual([...findDuplicateFacts(facts, new Map([["b", 1]]))], [["a", "b"]])
})

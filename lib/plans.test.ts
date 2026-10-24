import assert from "node:assert/strict"
import { test } from "node:test"
import { allowanceStates, monthStart, nextMonthStart } from "./plans.ts"

test("Free allowances turn low with a third left and out at zero", () => {
  const states = allowanceStates({ plan: "free", used: { tailored: 2, fixes: 25, updates: 0 }, resetsAt: "" })
  assert.deepEqual(states.map((s) => [s.key, s.left, s.state]), [["tailored", 1, "low"], ["fixes", 0, "out"], ["updates", 2, "ok"]])
})

test("Pro is unlimited and never low", () => {
  const states = allowanceStates({ plan: "pro", used: { tailored: 90, fixes: 400, updates: 12 }, resetsAt: "" })
  assert.ok(states.every((s) => s.limit === null && s.left === null && s.state === "ok"))
})

test("months reset on the 1st in UTC, across a year end", () => {
  const now = new Date("2026-12-31T23:30:00Z")
  assert.equal(monthStart(now).toISOString(), "2026-12-01T00:00:00.000Z")
  assert.equal(nextMonthStart(now).toISOString(), "2027-01-01T00:00:00.000Z")
})

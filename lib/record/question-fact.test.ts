import assert from "node:assert/strict"
import { test } from "node:test"
import { questionFact } from "./question-fact.ts"

test("only a confirmed proposed claim becomes a conflict fact", () => {
  const question = { kind: "conflict", prompt: 'We could not verify "Served 400 users". Is it right?' }
  assert.equal(questionFact(question, "Yes, that's right"), "Served 400 users")
  assert.equal(questionFact(question, "No"), null)
  assert.ok(questionFact(question, "Actually 40 users")?.endsWith(": Actually 40 users"))
  assert.equal(questionFact(question, null), null)
})

test("negative ordinary answers and range answers are retained", () => {
  assert.equal(questionFact({ kind: "team", prompt: "Was this a team project?" }, "No"), "Was this a team project: No")
  assert.equal(questionFact({ kind: "users", prompt: "How many weekly users?" }, "100–1k"), "How many weekly users: 100–1k")
})

import assert from "node:assert/strict"
import { test } from "node:test"
import { writeBullets } from "./write.ts"

test("shared READMEs cannot generate personal bullets before ownership is confirmed", async () => {
  const result = await writeBullets({
    userId: "test",
    items: [{ id: "team", type: "project", data: { name: "Team project", team_project: true }, status: "shown", pinned: false, rank: 80, reason: null }],
    facts: [{ id: "f", item_id: "team", text: "Built the entire payment system", label: "github", source_id: "s", quote: "Built the entire payment system", approx: false }],
  })
  assert.deepEqual(result.bullets, [])
})

test("the writer rejects a line that only repeats the entry's heading", async () => {
  const { checkBullet } = await import("./write.ts")
  const facts = new Map([["f", { id: "f", item_id: "free", text: "Freelance Web Application Developer from Aug 2024 to Present", label: "document" as const, source_id: "s", quote: "", approx: false }]])
  const heading = { title: "Web Application Developer", subtitle: "Freelance", dates: "Aug 2024 – Present" }
  const repeat = { item_id: "free", text: "Freelance Web Application Developer from Aug 2024 to Present", fact_ids: ["f"] }
  assert.ok(checkBullet(repeat, facts, heading).some((e) => e.includes("repeats the entry's heading")))
  assert.ok(!checkBullet(repeat, facts).some((e) => e.includes("repeats the entry's heading")))
})

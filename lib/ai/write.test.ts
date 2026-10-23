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

import assert from "node:assert/strict"
import { test } from "node:test"
import { byRecency } from "./dates.ts"
import { bulletHint } from "./hints.ts"

test("bullet hints name one fixable problem, worst first", () => {
  assert.equal(bulletHint("Worked on the backend for the app")?.kind, "weak_start")
  assert.equal(bulletHint("Responsible for deploying services to 3 regions")?.kind, "weak_start")
  assert.equal(bulletHint("Leveraged Redis to cache 2k requests")?.kind, "buzzword")
  assert.equal(bulletHint(Array.from({ length: 30 }, () => "word").join(" "))?.kind, "too_long")
  assert.equal(bulletHint("Built a CLI in Go that 200 students used", ["Built a parser", "Built a site"])?.kind, "repeated_verb")
  assert.equal(bulletHint("Built a CLI tool in Go")?.kind, "no_result")
  assert.equal(bulletHint("Cut page load time ~40% by caching API responses in Redis"), null)
})

test("entries sort newest first, with Present on top and undated last", () => {
  const entries = [
    { id: "old", start: "Jun 2021", end: "Aug 2021" },
    { id: "none" },
    { id: "now", start: "Jan 2024", end: "Present" },
    { id: "mid", start: "2022", end: "2023" },
    { id: "single", end: "May 2023" },
  ]
  assert.deepEqual([...entries].sort(byRecency).map((e) => e.id), ["now", "single", "mid", "old", "none"])
})

test("a dragged order is kept and new entries stay in their default slot", async () => {
  const { applyItemOrder, reorderWithin } = await import("./order.ts")
  const items = ["new", "a", "b", "c"].map((item_id) => ({ item_id }))
  assert.deepEqual(applyItemOrder(items, ["c", "a", "b"]).map((i) => i.item_id), ["new", "c", "a", "b"])
  assert.deepEqual(applyItemOrder(items, undefined).map((i) => i.item_id), ["new", "a", "b", "c"])
  assert.deepEqual(reorderWithin(["j1", "p1", "p2", "e1"], ["p2", "p1"]), ["j1", "p2", "p1", "e1"])
})

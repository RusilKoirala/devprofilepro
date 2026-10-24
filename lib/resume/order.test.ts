import assert from "node:assert/strict"
import { test } from "node:test"
import { resumeBullets } from "./order.ts"

const shared = [
  { id: "s1", item_id: "p", resume_id: null, replaces: null },
  { id: "s2", item_id: "p", resume_id: null, replaces: null },
]
const own = [
  { id: "t1", item_id: "p", resume_id: "r", replaces: "s1" },
  { id: "t2", item_id: "p", resume_id: "r", replaces: null },
  { id: "x1", item_id: "p", resume_id: "other", replaces: "s1" },
]

test("the base resume shows only shared lines", () => {
  assert.deepEqual(resumeBullets([...shared, ...own], "p").map((b) => b.id), ["s1", "s2"])
})

test("a tailored resume shows its own version in place, then its extra lines, never another resume's", () => {
  assert.deepEqual(resumeBullets([...shared, ...own], "p", { id: "r" }).map((b) => b.id), ["t1", "s2", "t2"])
})

test("hidden shared lines and rewritten items are left out on that resume only", () => {
  assert.deepEqual(resumeBullets([...shared, ...own], "p", { id: "r", hidden_bullets: ["s2"] }).map((b) => b.id), ["t1", "t2"])
  assert.deepEqual(resumeBullets([...shared, ...own], "p", { id: "r", own_items: ["p"] }).map((b) => b.id), ["t1", "t2"])
})

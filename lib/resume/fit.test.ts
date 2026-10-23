import assert from "node:assert/strict"
import { test } from "node:test"
import { fitToOnePage } from "./fit.ts"
import { parserView } from "./render.ts"
import type { Bullet, Item, ResumeLayout } from "@/lib/record/types"

test("fit preserves pinned content and reports overflow instead of clipping it", async () => {
  const item: Item = { id: "p", type: "project", data: { name: "Pinned project" }, rank: 50, status: "shown", reason: null, pinned: true }
  const bullets: Bullet[] = Array.from({ length: 180 }, (_, n) => ({ id: `b${n}`, item_id: item.id, text: `Built component number ${n} with a documented interface and regression checks for every release.`, fact_ids: ["f"], user_edited: true }))
  const layout: ResumeLayout = { headline: "Developer", section_order: ["project"], items: [{ item_id: item.id, bullet_ids: bullets.map((b) => b.id) }] }
  const result = await fitToOnePage(layout, { items: [item], bullets })
  assert.equal(result.pinnedOverflow, true)
  assert.ok(result.pages >= 3, "oversized entries must flow across pages instead of being drawn outside one page")
  assert.equal(result.cuts.length, 0)
  assert.equal(result.layout.items[0].bullet_ids.length, 180)
  assert.ok((await parserView(result.pdf)).includes("component number 179"))
})

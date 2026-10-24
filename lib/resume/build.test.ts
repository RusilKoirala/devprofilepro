import assert from "node:assert/strict"
import { test } from "node:test"
import { buildResume } from "./build.ts"
import type { Item } from "@/lib/record/types"

const edu = (data: Item["data"]): Item => ({ id: "e", type: "education", data, rank: 50, status: "shown", reason: null, pinned: false })
const layout = { headline: "", section_order: ["education" as const], items: [{ item_id: "e", bullet_ids: [] }] }

test("education prints a date once when its details already say it", () => {
  const entry = (data: Item["data"]) => buildResume(layout, { items: [edu(data)], bullets: [] }).sections[0].entries[0]
  const twice = entry({ school: "Example High School", degree: "Grades 11–12", details: "Expected Graduation: 2027", end: "Expected Graduation: 2027" })
  assert.equal(twice.subtitle, "Grades 11–12, Expected Graduation: 2027")
  assert.equal(twice.dates, "")
  const startKept = entry({ school: "Example University", degree: "BSc", details: "Expected graduation 2027", start: "2023", end: "2027" })
  assert.equal(startKept.dates, "2023")
  const plain = entry({ school: "Example University", degree: "BSc", start: "2023", end: "2027" })
  assert.equal(plain.dates, "2023 – 2027")
  const nested = entry({ school: "Example University", degree: "BSc Computer Science, GPA 3.8", details: "GPA 3.8" })
  assert.equal(nested.subtitle, "BSc Computer Science, GPA 3.8")
})

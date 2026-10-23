import assert from "node:assert/strict"
import { test } from "node:test"
import { runChecks } from "./checks.ts"
import type { ResumeDoc } from "./schema.ts"

const doc: ResumeDoc = { name: "Test", headline: "", contact: { email: "", phone: "", location: "", website: "", github: "", linkedin: "" }, sections: [] }
async function dates(value: string) {
  const result = await runChecks({ ...doc, sections: [{ type: "job", title: "Experience", entries: [{ item_id: "i", title: "Engineer", subtitle: "", dates: value, location: "", url: "", tech: [], bullets: [] }] }] }, { pages: 1, allBulletsSourced: true })
  return result.results.find((r) => r.id === "dates")!
}

test("date checks detect backwards numeric months and year boundaries", async () => {
  assert.equal((await dates("12/2025 – 01/2025")).status, "fail")
  assert.equal((await dates("Jan 2026 – Dec 2025")).status, "fail")
  assert.equal((await dates("Sep 2025 – Oct 2025")).status, "pass")
  assert.equal((await dates("Dec 2025 – Jan 2026")).status, "pass")
})

test("unrecognized and missing dates never pass as checked", async () => {
  assert.equal((await dates("13/2025 – 14/2025")).status, "warn")
  assert.equal((await dates("Spring 2024 – Summer 2025")).status, "warn")
  assert.equal((await dates("")).status, "not_checked")
})

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

test("content checks flag empty entries, heading repeats, link-only lines and double listings", async () => {
  const { contentChecks } = await import("./checks.ts")
  const e = (title: string, subtitle: string, dates: string, bullets: string[], url = "") => ({ item_id: title, title, subtitle, dates, location: "", url, tech: [], bullets: bullets.map((text, n) => ({ id: `${title}${n}`, text })) })
  const results = contentChecks({
    ...doc,
    sections: [
      { type: "job", title: "Experience", entries: [e("Engineer", "Acme", "Jun 2024 – Present", ["Engineer at Acme, Jun 2024 – Present"]), e("Contributor", "Layer5", "", [])] },
      { type: "project", title: "Projects", entries: [e("PulseOps", "", "", ["Deployed at https://pulseops.vercel.app"], "https://pulseops.vercel.app")] },
      { type: "education", title: "Education", entries: [e("Example University", "BSc, Expected graduation May 2027", "May 2027", [])] },
      { type: "skills", title: "Skills", entries: [e("Languages", "Go, Node.js", "", []), e("Tools", "Node.js, Docker", "", [])] },
    ],
  }, { openOwnership: [{ itemId: "Contributor", title: "Layer5" }] })
  const status = Object.fromEntries(results.map((r) => [r.id, r.status]))
  assert.deepEqual(status, { empty: "warn", thin: "warn", repeats: "warn", ownership: "warn" })
})

test("an entry with no lines keeps the resume from being called ready, and points at the entry", async () => {
  const entry = { item_id: "j1", title: "Contributor", subtitle: "Layer5", dates: "", location: "", url: "", tech: [], bullets: [] }
  const result = await runChecks({ ...doc, name: "Sam", contact: { ...doc.contact, email: "s@example.com", github: "" }, sections: [{ type: "job", title: "Experience", entries: [entry] }] }, { pages: 1, allBulletsSourced: true })
  const empty = result.results.find((r) => r.id === "empty")!
  assert.equal(empty.status, "warn")
  assert.deepEqual(empty.targets, [{ itemId: "j1" }])
  assert.equal(result.ready, false)
})

import assert from "node:assert/strict"
import { test } from "node:test"
import type { Bullet, Fact, Item, ResumeLayout } from "@/lib/record/types"
import { thinLine } from "./thin.ts"
import { dropMessage, skillFocus, tidyTailored } from "./tidy.ts"
import { focusedSkills } from "./build.ts"

const item = (id: string, type: Item["type"], data: Item["data"], pinned = false): Item => ({ id, type, data, rank: 50, status: "shown", reason: null, pinned })
const line = (id: string, item_id: string, text: string, extra: Partial<Bullet> = {}): Bullet => ({ id, item_id, text, fact_ids: ["f"], user_edited: false, ...extra })
const layout = (include: string[], more: Partial<ResumeLayout> = {}): ResumeLayout => ({ headline: "", section_order: [], items: [], include, ...more })

const freelance = { title: "Web Application Developer", subtitle: "Freelance", dates: "Aug 2024 – Present" }

// The 2026-10-25 audit's lines.
test("lines that only repeat the heading, give a link or count commits are thin", () => {
  assert.ok(thinLine("Freelance Web Application Developer from Aug 2024 to Present", freelance))
  assert.ok(thinLine("Deployed the Student API live at https://student-api.example.app", { title: "Student API", subtitle: "", dates: "" }))
  assert.ok(thinLine("Made 17 commits in a solo repo", { title: "PulseOps", subtitle: "", dates: "" }))
  assert.ok(!thinLine("Built PulseOps uptime monitoring backend with Express and Postgres to check websites and send email alerts", { title: "PulseOps", subtitle: "", dates: "" }))
})

const items = [
  item("free", "job", { role: "Web Application Developer", company: "Freelance", start: "Aug 2024", end: "Present" }),
  item("oss", "job", { role: "Open Source Contributor" }),
  item("pinned", "job", { role: "Intern", company: "Acme" }, true),
  item("api", "project", { name: "Student API" }),
  item("edu", "education", { school: "Example University" }),
]

test("thin lines come off this resume and empty entries come off the page", () => {
  const bullets = [
    line("b-repeat", "free", "Freelance Web Application Developer from Aug 2024 to Present"),
    line("b-real", "free", "Built Node.js and Go APIs behind client dashboards for small businesses"),
    line("b-deploy", "api", "Deployed the Student API live at https://student-api.example.app", { resume_id: "r" }),
  ]
  const out = tidyTailored({ id: "r", layout: layout(["free", "oss", "pinned", "api", "edu"], { own_items: ["api"] }) }, items, bullets)
  assert.deepEqual(out.hide, ["b-repeat"])
  assert.deepEqual(out.remove, ["b-deploy"])
  // Open Source Contributor had no lines; Student API's only line was a link. The pinned job stays.
  assert.deepEqual(out.drop, [{ id: "oss", reason: "no_facts" }, { id: "api", reason: "no_facts" }])
})

test("a line the person wrote stays, and keeps its entry on the page", () => {
  const bullets = [line("b-mine", "free", "Freelance Web Application Developer from Aug 2024 to Present", { user_edited: true })]
  const out = tidyTailored({ id: "r", layout: layout(["free"]) }, items, bullets)
  assert.deepEqual(out, { hide: [], remove: [], drop: [] })
})

const fact = (id: string, item_id: string, text: string): Fact => ({ id, item_id, text, label: "document", source_id: "s", quote: text, approx: false })

// The retest: Layer5 had facts but was team work waiting on an answer, not "nothing recorded".
test("an entry taken off says why, accurately", () => {
  const layer5 = item("l5", "job", { role: "Open Source Contributor", company: "Layer5", team_project: true })
  const facts = [fact("f1", "l5", "Contributed to Meshery, implementing user role logging and granular permission key handling")]
  const out = tidyTailored({ id: "r", layout: layout(["l5"]) }, [layer5], [], facts)
  assert.deepEqual(out.drop, [{ id: "l5", reason: "ownership" }])
  assert.match(dropMessage("Open Source Contributor, Layer5", "ownership"), /which parts were yours/)
})

test("Skills leads with the tools the job asks for that the resume's facts name", () => {
  const langs = item("langs", "skills", { category: "Languages", skills: ["Go", "Node.js", "TypeScript", "JavaScript"] })
  const tools = item("tools", "skills", { category: "Tools", skills: ["Git", "Docker"] })
  const pulse = item("pulse", "project", { name: "PulseOps", tech: ["express", "postgres"] })
  const facts = [fact("f-pulse", "pulse", "Express and Postgres uptime monitoring"), fact("f-go", "free", "Go and Node.js APIs for clients")]
  const reqs = [
    { text: "PostgreSQL or another SQL database", status: "covered", fact_ids: ["f-pulse"] },
    { text: "Node.js REST APIs", status: "unclear", fact_ids: ["f-go"] },
    { text: "Kubernetes", status: "not_found", fact_ids: [] },
    { text: "Docker", status: "elsewhere", fact_ids: [] },
  ]
  const focus = skillFocus(reqs, facts, [langs, tools, pulse], [langs, tools])
  // PostgreSQL is in no group, so it joins the tools list; Node.js moves to the front of its own.
  assert.deepEqual(focus, { tools: ["PostgreSQL"], langs: ["Node.js"] })
  assert.deepEqual(focusedSkills(["Git", "Docker", "Postgres"], ["PostgreSQL"]), ["PostgreSQL", "Git", "Docker"])
})

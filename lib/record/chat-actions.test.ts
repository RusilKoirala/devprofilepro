import assert from "node:assert/strict"
import { test } from "node:test"
import { checkActions, presentFields, type ChatAction, type ChatContext } from "./chat-actions.ts"

const ctx: ChatContext = {
  lines: new Map([["l1", { entryId: "p1", text: "Built a CLI in Go" }]]),
  entries: new Map([
    ["p1", { type: "project", title: "Go CLI", onPage: true }],
    ["e1", { type: "education", title: "School", onPage: true }],
    ["p2", { type: "project", title: "Old app", onPage: false }],
  ]),
  sections: ["education", "project"],
  factsByEntry: new Map([["p1", ["Used by ~200 students"]]]),
  userMessages: ["it had 3 contributors"],
}
const a = (patch: Partial<ChatAction>): ChatAction => ({ type: "edit_line", line_id: null, entry_id: null, section: null, position: null, text: null, fields: null, ...patch })

test("chat edits may only use numbers from the facts or the user's own messages", () => {
  const [fromFacts, fromUser, invented] = checkActions([
    a({ line_id: "l1", text: "Built a Go CLI used by ~200 students" }),
    a({ line_id: "l1", text: "Built a Go CLI with 3 contributors" }),
    a({ line_id: "l1", text: "Built a Go CLI that cut build time 40%" }),
  ], ctx)
  assert.equal(fromFacts.ok, true)
  assert.equal(fromUser.ok, true)
  assert.equal(invented.ok, false)
})

test("chat edits must point at what is really on the resume", () => {
  const results = checkActions([
    a({ line_id: "nope", text: "x y z" }),
    a({ type: "rewrite_entry", entry_id: "p2" }),
    a({ type: "show_entry", entry_id: "p2" }),
    a({ type: "add_line", entry_id: "e1", text: "Dean's list" }),
    a({ type: "move_section", section: "skills", position: 0 }),
    a({ type: "move_section", section: "project", position: 0 }),
    a({ type: "edit_line", line_id: "l1", text: "Leveraged Go to build a CLI" }),
  ], ctx)
  assert.deepEqual(results.map((r) => r.ok), [false, false, true, false, false, true, false])
})

test("only the fields the model filled in are passed on", () => {
  const fields = { role: null, company: "Acme", name: null, url: null, school: null, degree: null, details: null, category: null, location: "", start: null, end: null, tech: null, skills: null, headline: null, target_role: null, email: null, phone: null, website: null, github: null, linkedin: null }
  assert.deepEqual(presentFields(fields, ["role", "company", "location"] as const), { company: "Acme", location: "" })
})

test("a section put back by an earlier action can be moved in the same message", () => {
  const start: ChatContext = { ...ctx, entries: new Map([...ctx.entries, ["j1", { type: "job", title: "Acme", onPage: false }]]), sections: ["education", "project"] }
  const [show, move] = checkActions([a({ type: "show_entry", entry_id: "j1" }), a({ type: "move_section", section: "job", position: 0 })], start)
  assert.equal(show.ok, true)
  assert.equal(move.ok, true, move.reason)
  // The caller's context is not changed by checking.
  assert.equal(start.entries.get("j1")!.onPage, false)
})

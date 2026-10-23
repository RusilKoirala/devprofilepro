import { test } from "node:test"
import assert from "node:assert/strict"
import { bannedWordsIn, groundItemData, quoteInSource, unsupportedNumbers, verifyFacts } from "./verify.ts"

test("quote matches across whitespace, case and curly quotes", () => {
  const raw = "Software  Intern, Acme\n- Built the “OAuth” login with NextAuth"
  assert.equal(quoteInSource('built the "oauth" login', raw), true)
  assert.equal(quoteInSource("Software Intern, Acme", raw), true)
  assert.equal(quoteInSource("Senior Engineer, Acme", raw), false)
})

test("facts with unknown sources or missing quotes are dropped", () => {
  const sources = new Map([["s1", "Built a CLI used by 40 teams"]])
  const { kept, dropped } = verifyFacts(
    [
      { text: "Built a CLI", source_id: "s1", quote: "Built a CLI" },
      { text: "Used by 400 teams", source_id: "s1", quote: "used by 400 teams" },
      { text: "x", source_id: "nope", quote: "Built" },
    ],
    sources
  )
  assert.equal(kept.length, 1)
  assert.deepEqual(dropped.map((d) => d.reason), ["quote_not_found", "unknown_source"])
})

test("numbers in a bullet must come from its facts", () => {
  assert.deepEqual(unsupportedNumbers("Served ~2k weekly users", ["About 2,000 weekly users"]), [])
  assert.deepEqual(unsupportedNumbers("Served 100-1k users", ["100–1k users"]), [])
  assert.deepEqual(unsupportedNumbers("Cut latency by 40%", ["Made the API faster"]), ["40%"])
})

test("quantities cannot lose their scale, uncertainty, units or range", () => {
  for (const [bullet, fact] of [
    ["Served 2 users", "Served 2k users"],
    ["Served 2k users", "Served 2 users"],
    ["Cut latency 40%", "Latency was 40 ms"],
    ["Served 1,000 users", "Served 100–1k users"],
    ["Served 200 users", "Served ~200 users"],
    ["Served 100 users", "Served <100 users"],
    ["Served 1k users", "Served 1k+ users"],
  ]) assert.notEqual(unsupportedNumbers(bullet, [fact]).length, 0, `${bullet} must not be supported by ${fact}`)
  assert.deepEqual(unsupportedNumbers("Served ~2k users", ["Served about 2,000 users"]), [])
  assert.deepEqual(unsupportedNumbers("Served 100-1k users", ["Served 100–1,000 users"]), [])
})

test("a real quote cannot support an invented metric in the fact text", () => {
  const result = verifyFacts([{ text: "Built a CLI for 400 teams", source_id: "s", quote: "Built a CLI for 40 teams" }], new Map([["s", "Built a CLI for 40 teams"]]))
  assert.equal(result.kept.length, 0)
  assert.equal(result.dropped[0].reason, "unsupported_number")
})

test("banned words are caught", () => {
  assert.deepEqual(bannedWordsIn("Spearheaded a cutting-edge rewrite"), ["spearheaded", "cutting-edge", "cutting edge"])
  assert.deepEqual(bannedWordsIn("Built a parser"), [])
})

test("rendered metadata cannot introduce unsupported titles, dates or skills", () => {
  assert.deepEqual(groundItemData({ name: "Alex", role: "Senior Engineer", start: "Jun 2024", end: "2027", skills: ["Go", "Google Cloud", "Rust"], github: "https://github.com/alex" }, ["Alex — Intern, Jun 2024. Google Cloud. github.com/alex"]), {
    name: "Alex", role: null, start: "Jun 2024", end: null, skills: ["Google Cloud"], github: "https://github.com/alex",
  })
})

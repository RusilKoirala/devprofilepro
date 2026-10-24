import assert from "node:assert/strict"
import { test } from "node:test"
import { escapeLatex, toLatex } from "./latex.ts"

test("LaTeX escapes backslashes without escaping its generated commands", () => {
  assert.equal(escapeLatex("a\\b & 50% ~ ^ {x}"), String.raw`a\textbackslash{}b \& 50\% \textasciitilde{} \textasciicircum{} \{x\}`)
})

test("LaTeX links escape braces and commands as well as percent signs", () => {
  const tex = toLatex({ template: "classic", name: "Test", headline: "", contact: { email: "a_b@example.com", phone: "", location: "", github: "", linkedin: "", website: "https://example.com/{x}\\input{evil}?q=50%" }, sections: [] })
  assert.ok(tex.includes(String.raw`\href{https://example.com/\{x\}\textbackslash{}input\{evil\}?q=50\%}`))
  assert.ok(tex.includes(String.raw`\href{mailto:a\_b@example.com}`))
})

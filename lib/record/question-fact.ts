// A generic negative answer is still useful evidence. Only rejecting a proposed
// conflict claim means there is no affirmative fact to add.
export function questionFact(question: { kind: string | null; prompt: string }, answer: string | null): string | null {
  const clean = answer?.trim()
  if (!clean) return null
  if (question.kind === "conflict" && clean === "No") return null
  if (question.kind === "conflict" && clean === "Yes, that's right") {
    return question.prompt.match(/"(.+)"/)?.[1] ?? `${question.prompt}: ${clean}`
  }
  return `${question.prompt.replace(/\?$/, "")}: ${clean}`
}

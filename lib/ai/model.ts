// One place to change models. Claude is used when ANTHROPIC_API_KEY is set, otherwise OpenAI.
// Whether A0/A1 can move to a cheaper model is decided after running the evals (docs/IMPLEMENTATION.md section 16).
export const CLAUDE_MODEL = "claude-opus-5-5"
export const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4.1-mini"

export type AiProvider = "anthropic" | "openai"
export type AiStep = "transcribe" | "extract" | "questions" | "write" | "tailor" | "win"

export function aiProvider(): AiProvider | null {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic"
  if (process.env.OPENAI_API_KEY) return "openai"
  return null
}

export function modelFor(provider: AiProvider) {
  return provider === "anthropic" ? CLAUDE_MODEL : OPENAI_MODEL
}

// USD per million tokens, used only to estimate spend for the daily budget. Unknown models are
// priced high on purpose, so the budget trips early rather than late.
const PRICES: Record<string, { input: number; cachedInput: number; output: number }> = {
  "claude-opus-5-5": { input: 4, cachedInput: 0.2, output: 20 },
  "gpt-4.1-mini": { input: 0.4, cachedInput: 0.1, output: 1.6 },
  "gpt-4.1-nano": { input: 0.1, cachedInput: 0.025, output: 0.4 },
  "gpt-4o-mini": { input: 0.15, cachedInput: 0.075, output: 0.6 },
}
const UNKNOWN_PRICE = { input: 5, cachedInput: 5, output: 25 }

export function estimateCostUsd(model: string, usage: { input: number; cachedInput: number; output: number }) {
  const p = PRICES[model] ?? UNKNOWN_PRICE
  return ((usage.input - usage.cachedInput) * p.input + usage.cachedInput * p.cachedInput + usage.output * p.output) / 1_000_000
}

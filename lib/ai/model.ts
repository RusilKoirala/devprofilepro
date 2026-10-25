// One place to change models. Each step goes to the model that suits it:
//   building steps (reading sources, choosing entries, writing bullets) need judgment and go to
//   Claude, through ANTHROPIC_API_KEY or Amazon Bedrock (AWS_BEARER_TOKEN_BEDROCK);
//   small edits (chat, logging a win) are quick and go to OpenAI (OPENAI_API_KEY).
// Either side falls back to the other when its key is missing.
export type AiProvider = "anthropic" | "bedrock" | "openai"
export type AiStep = "transcribe" | "extract" | "questions" | "write" | "tailor" | "win" | "chat"

const BUILD_STEPS = new Set<AiStep>(["transcribe", "extract", "questions", "write", "tailor"])

// Opus where one call decides the most: the Career Record everything else is built from, and the
// match against a job post. Sonnet for steps that run often. Override any of them with CLAUDE_MODEL_<STEP>.
const CLAUDE_MODELS: Record<AiStep, string> = {
  extract: "claude-opus-5-5",
  tailor: "claude-opus-5-5",
  write: "claude-sonnet-5-5",
  questions: "claude-sonnet-5-5",
  transcribe: "claude-sonnet-5-5",
  chat: "claude-sonnet-5-5",
  win: "claude-sonnet-5-5",
}
// OpenAI's side of the same split: the strongest model for building, a quick one for edits.
export const OPENAI_BUILD_MODEL = process.env.OPENAI_BUILD_MODEL ?? "gpt-6.1-sol"
export const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-5.6-luna"
// Pro accounts past their daily allowance keep working on these instead of being stopped (docs/PRICING.md).
export const FAST_CLAUDE_MODEL = "claude-haiku-5-5"
export const FAST_OPENAI_MODEL = "gpt-4.1-nano"

export const BEDROCK_REGION = process.env.BEDROCK_REGION ?? process.env.AWS_REGION ?? "us-east-1"

function claudeProvider(): AiProvider | null {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic"
  if (process.env.AWS_BEARER_TOKEN_BEDROCK) return "bedrock"
  return null
}

function openaiProvider(): AiProvider | null {
  return process.env.OPENAI_API_KEY ? "openai" : null
}

// The provider a step runs on first, then the one to try if that call fails or is declined.
export function providersFor(step: AiStep): AiProvider[] {
  const claude = claudeProvider()
  const openai = openaiProvider()
  const order = BUILD_STEPS.has(step) ? [claude, openai] : [openai, claude]
  return order.filter((p): p is AiProvider => !!p)
}

// The provider that builds resumes, for the pages that say where data goes and for scripts.
export function aiProvider(): AiProvider | null {
  return providersFor("extract")[0] ?? null
}

export function aiProviderLabel(): string {
  const names = { anthropic: "Anthropic (Claude)", bedrock: "Amazon Bedrock (Claude)", openai: "OpenAI" }
  const used = [...new Set([...providersFor("extract"), ...providersFor("chat")])]
  return used.length ? used.map((p) => names[p]).join(" and ") : "your configured AI provider"
}

export function modelFor(provider: AiProvider, step: AiStep = "extract", fast = false) {
  if (provider === "openai") return fast ? FAST_OPENAI_MODEL : BUILD_STEPS.has(step) ? OPENAI_BUILD_MODEL : OPENAI_MODEL
  const id = fast ? FAST_CLAUDE_MODEL : (process.env[`CLAUDE_MODEL_${step.toUpperCase()}`] ?? CLAUDE_MODELS[step])
  // Bedrock names the same models with a provider prefix.
  return provider === "bedrock" ? `anthropic.${id}` : id
}

// USD per million tokens, used only to estimate spend for the daily budget. Unknown models are
// priced high on purpose, so the budget trips early rather than late.
const PRICES: Record<string, { input: number; cachedInput: number; output: number }> = {
  "claude-opus-5-5": { input: 4, cachedInput: 0.2, output: 20 },
  "claude-sonnet-5-5": { input: 2, cachedInput: 0.2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, cachedInput: 0.01, output: 0.5 },
  // GPT-6.1 Sol and 5.6 Sol: the higher of the published rates, until OpenAI's own page confirms them.
  "gpt-6.1-sol": { input: 4, cachedInput: 0.4, output: 15 },
  "gpt-5.6-sol": { input: 5, cachedInput: 0.5, output: 30 },
  "gpt-5.6-terra": { input: 2, cachedInput: 0.2, output: 12 },
  "gpt-5.6-luna": { input: 0.2, cachedInput: 0.02, output: 1.2 },
  "gpt-4.1-mini": { input: 0.4, cachedInput: 0.1, output: 1.6 },
  "gpt-4.1-nano": { input: 0.1, cachedInput: 0.025, output: 0.4 },
  "gpt-4o-mini": { input: 0.15, cachedInput: 0.075, output: 0.6 },
}
const UNKNOWN_PRICE = { input: 5, cachedInput: 5, output: 25 }

export function estimateCostUsd(model: string, usage: { input: number; cachedInput: number; output: number }) {
  const p = PRICES[model.replace(/^anthropic\./, "")] ?? UNKNOWN_PRICE
  return ((usage.input - usage.cachedInput) * p.input + usage.cachedInput * p.cachedInput + usage.output * p.output) / 1_000_000
}

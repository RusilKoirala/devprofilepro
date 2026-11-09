export type AiProvider = "anthropic" | "bedrock" | "openai"
export type AiStep = "transcribe" | "extract" | "questions" | "write" | "tailor" | "win" | "chat"

const BUILD_STEPS = new Set<AiStep>(["transcribe", "extract", "questions", "write", "tailor"])

const CLAUDE_MODELS: Record<AiStep, string> = {
  extract: "claude-opus-5-5",
  tailor: "claude-opus-5-5",
  write: "claude-sonnet-5-5",
  questions: "claude-sonnet-5-5",
  transcribe: "claude-sonnet-5-5",
  chat: "claude-sonnet-5-5",
  win: "claude-sonnet-5-5",
}
export const OPENAI_BUILD_MODEL = process.env.OPENAI_BUILD_MODEL ?? "gpt-6.1-sol"
export const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-5.6-luna"
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

export function providersFor(step: AiStep): AiProvider[] {
  const claude = claudeProvider()
  const openai = openaiProvider()
  const order = BUILD_STEPS.has(step) ? [claude, openai] : [openai, claude]
  return order.filter((p): p is AiProvider => !!p)
}

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
  return provider === "bedrock" ? `anthropic.${id}` : id
}

const PRICES: Record<string, { input: number; cachedInput: number; output: number }> = {
  "claude-opus-5-5": { input: 4, cachedInput: 0.2, output: 20 },
  "claude-sonnet-5-5": { input: 2, cachedInput: 0.2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, cachedInput: 0.01, output: 0.5 },
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

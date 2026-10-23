// Credits are how AI usage is shown to people: 1 credit = 1 US cent of estimated model cost.
// The daily allowance is AI_USER_DAILY_BUDGET_USD (lib/ai/budget.ts). Change the rate here only.
// Editing, checks and downloads never cost credits.
import type { AiStep } from "@/lib/ai/model"

export const CREDITS_PER_USD = 100

export function usdToCredits(usd: number): number {
  return Math.round(usd * CREDITS_PER_USD)
}

// What each AI step is, in the words the dashboard uses.
export const ACTIVITY: Record<AiStep, string> = {
  extract: "Reading your sources",
  write: "Writing lines",
  questions: "Impact questions",
  tailor: "New resumes",
  chat: "Chat edits",
  transcribe: "Scanned PDFs",
  win: "Logged wins",
}

export interface CreditUsage {
  limit: number
  usedToday: number
  left: number
  resetsInHours: number
  week: { activity: string; credits: number; runs: number }[]
  weekTotal: number
}

// From ai_runs rows (the same rows the budget check counts). Pure, so the page can call it with any rows.
export function summarizeUsage(runs: { step: string; created_at: string; meta: unknown }[], limitUsd: number, now = new Date()): CreditUsage {
  const day = now.toISOString().slice(0, 10)
  const cost = (r: (typeof runs)[number]) => Number((r.meta as { cost_usd?: number } | null)?.cost_usd ?? 0)
  const usedToday = usdToCredits(runs.filter((r) => r.created_at.slice(0, 10) === day).reduce((n, r) => n + cost(r), 0))
  const limit = usdToCredits(limitUsd)
  const byActivity = new Map<string, { credits: number; runs: number }>()
  let weekUsd = 0
  for (const r of runs) {
    const activity = ACTIVITY[r.step as AiStep] ?? "Other"
    const row = byActivity.get(activity) ?? { credits: 0, runs: 0 }
    row.credits += cost(r)
    row.runs += 1
    byActivity.set(activity, row)
    weekUsd += cost(r)
  }
  const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  return {
    limit,
    usedToday: Math.min(usedToday, limit),
    left: Math.max(0, limit - usedToday),
    resetsInHours: Math.max(1, Math.ceil((midnight - now.getTime()) / 3_600_000)),
    week: [...byActivity].map(([activity, v]) => ({ activity, credits: usdToCredits(v.credits), runs: v.runs })).sort((a, b) => b.credits - a.credits || b.runs - a.runs),
    weekTotal: usdToCredits(weekUsd),
  }
}

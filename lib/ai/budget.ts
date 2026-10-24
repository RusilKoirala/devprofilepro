import "server-only"
import { isProActive, type SubscriptionRow } from "@/lib/billing/events"
import { createClient } from "@/lib/supabase/server"

// Spend guards, on top of whatever hard limit is set in the provider's billing dashboard.
//   AI_USER_DAILY_BUDGET_USD    Free: per user per day, from ai_runs (default $0.50)
//   AI_PRO_DAILY_BUDGET_USD     Pro: per user per day at full quality (default $3). Past it, Pro
//                               keeps working on a faster model instead of stopping.
//   AI_PRO_HARD_DAILY_USD       Pro: abuse stop, per user per day (default $10)
//   AI_SERVER_DAILY_BUDGET_USD  per server process per day, all users together (default $2).
//                               Past it, Free pauses and Pro moves to the faster model.
export const USER_DAILY = Number(process.env.AI_USER_DAILY_BUDGET_USD ?? 0.5)
export const PRO_DAILY = Number(process.env.AI_PRO_DAILY_BUDGET_USD ?? 3)
const PRO_HARD = Number(process.env.AI_PRO_HARD_DAILY_USD ?? 10)
const SERVER_DAILY = Number(process.env.AI_SERVER_DAILY_BUDGET_USD ?? 2)

export class BudgetError extends Error {}

let serverDay = ""
let serverSpent = 0

function today() {
  return new Date().toISOString().slice(0, 10)
}

export function recordSpend(usd: number) {
  if (serverDay !== today()) {
    serverDay = today()
    serverSpent = 0
  }
  serverSpent += usd
}

// Whether this call may run, and on which model. `fast` = use the faster model.
export async function checkBudget(): Promise<{ pro: boolean; fast: boolean }> {
  const serverOver = serverDay === today() && serverSpent >= SERVER_DAILY
  let spent = 0
  let pro = false
  try {
    const supabase = await createClient()
    const [{ data }, { data: sub }] = await Promise.all([
      supabase.from("ai_runs").select("meta").gte("created_at", `${today()}T00:00:00Z`),
      supabase.from("subscriptions").select("source,status,current_period_end").maybeSingle(),
    ])
    spent = (data ?? []).reduce((sum, r) => sum + Number((r.meta as { cost_usd?: number })?.cost_usd ?? 0), 0)
    pro = isProActive(sub as Pick<SubscriptionRow, "source" | "status" | "current_period_end"> | null)
  } catch {
    // No session (e.g. evals): only the server-wide cap applies.
    if (serverOver) throw new BudgetError(`AI is paused for today: the server's $${SERVER_DAILY} daily budget is used up. Editing and downloads still work.`)
    return { pro: false, fast: false }
  }
  if (pro) {
    if (spent >= PRO_HARD) throw new BudgetError("This account has used an unusually large amount of AI today, so it's paused until midnight UTC. Editing and downloads still work. If this is normal use, email dev@rusil.me.")
    return { pro, fast: serverOver || spent >= PRO_DAILY }
  }
  if (serverOver) throw new BudgetError("AI is busy for today. Editing and downloads still work; try again tomorrow, or go Pro to keep going.")
  if (spent >= USER_DAILY) throw new BudgetError("You've hit today's free AI limit. Editing and downloads still work, and it resets at midnight UTC.")
  return { pro, fast: false }
}

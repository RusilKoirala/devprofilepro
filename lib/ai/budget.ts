import "server-only"
import { createClient } from "@/lib/supabase/server"

// Spend guards, on top of whatever hard limit is set in the provider's billing dashboard.
//   AI_USER_DAILY_BUDGET_USD    per user per day, from ai_runs (default $0.50)
//   AI_SERVER_DAILY_BUDGET_USD  per server process per day, all users together (default $2)
const USER_DAILY = Number(process.env.AI_USER_DAILY_BUDGET_USD ?? 0.5)
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

export async function checkBudget() {
  if (serverDay === today() && serverSpent >= SERVER_DAILY) {
    throw new BudgetError(`AI is paused for today: the server's $${SERVER_DAILY} daily budget is used up. Editing and downloads still work.`)
  }
  let spent = 0
  try {
    const supabase = await createClient()
    const { data } = await supabase.from("ai_runs").select("meta").gte("created_at", `${today()}T00:00:00Z`)
    spent = (data ?? []).reduce((sum, r) => sum + Number((r.meta as { cost_usd?: number })?.cost_usd ?? 0), 0)
  } catch {
    return // no session (e.g. evals): the server-wide cap still applies
  }
  if (spent >= USER_DAILY) {
    throw new BudgetError(`You've used today's AI budget ($${USER_DAILY}). Editing and downloads still work; try again tomorrow.`)
  }
}

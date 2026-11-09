import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { ALLOWANCE_LABELS, allowanceStates, type Allowance } from "@/lib/plans"
import { loadPlanUsage } from "@/lib/usage"

export class AllowanceError extends Error {
  constructor(public allowance: Allowance, message: string) {
    super(message)
  }
}

const OUT: Record<Allowance, (limit: number, resets: string) => string> = {
  tailored: (n, d) => `You've used this month's ${n} free tailored resumes. Pro makes them unlimited, or you get ${n} more on ${d}.`,
  fixes: (n, d) => `You've used this month's ${n} free AI fixes. You can still edit lines yourself. Pro makes AI fixes unlimited, or you get ${n} more on ${d}.`,
  updates: (n, d) => `You've used this month's ${n} free syncs and rebuilds. Pro syncs anytime, or you get ${n} more on ${d}.`,
}

export async function requireAllowance(supabase: SupabaseClient, key: Allowance) {
  const usage = await loadPlanUsage(supabase)
  if (usage.unavailable) return
  const state = allowanceStates(usage).find((a) => a.key === key)!
  if (state.state !== "out" || state.limit == null) return
  const resets = new Date(usage.resetsAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
  throw new AllowanceError(key, OUT[key](state.limit, resets))
}

export async function recordUsage(supabase: SupabaseClient, key: Allowance, ref?: string) {
  const { error } = await supabase.from("usage_events").insert({ kind: key, ref: ref ?? null })
  if (error) console.error(`usage_events insert failed (${ALLOWANCE_LABELS[key].unit})`, error)
}

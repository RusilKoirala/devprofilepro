import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { ALLOWANCE_LABELS, allowanceStates, type Allowance } from "@/lib/plans"
import { loadPlanUsage } from "@/lib/usage"

// Free's monthly allowances, enforced on the server before the AI call (docs/PRICING.md section 5).
// Running out never locks anything: editing, checks and downloads keep working.

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

// Throws AllowanceError when a Free user has none of this allowance left. Pro and unlimited pass.
// If usage can't be loaded we let the request through: the spend budget still guards cost.
export async function requireAllowance(supabase: SupabaseClient, key: Allowance) {
  const usage = await loadPlanUsage(supabase)
  if (usage.unavailable) return
  const state = allowanceStates(usage).find((a) => a.key === key)!
  if (state.state !== "out" || state.limit == null) return
  const resets = new Date(usage.resetsAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
  throw new AllowanceError(key, OUT[key](state.limit, resets))
}

// One counted use, after it succeeded. Recorded for Pro too, so the dashboard shows real numbers.
export async function recordUsage(supabase: SupabaseClient, key: Allowance, ref?: string) {
  const { error } = await supabase.from("usage_events").insert({ kind: key, ref: ref ?? null })
  // The use already happened; a failed count must not turn it into an error for the user.
  if (error) console.error(`usage_events insert failed (${ALLOWANCE_LABELS[key].unit})`, error)
}

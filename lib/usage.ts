import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { isProActive, type SubscriptionRow } from "@/lib/billing/events"
import { monthStart, nextMonthStart, type PlanUsage } from "@/lib/plans"

// This month's usage against the plan allowances, from rows we already keep:
//   tailored = tailored resumes created, fixes = chat turns + rewrites the user asked for,
//   updates  = successful source reads (first build, rebuilds, GitHub/LinkedIn syncs).
// Failed AI calls never count. The plan comes from the subscriptions row the Dodo webhook keeps.
export async function loadPlanUsage(supabase: SupabaseClient, now = new Date()): Promise<PlanUsage> {
  const since = monthStart(now).toISOString()
  const [tailored, runs, { data: sub }] = await Promise.all([
    supabase.from("resumes").select("id", { count: "exact", head: true }).eq("kind", "tailored").gte("created_at", since),
    supabase.from("ai_runs").select("step,meta").eq("ok", true).in("step", ["chat", "write", "extract"]).gte("created_at", since),
    supabase.from("subscriptions").select("source,status,current_period_end,cancel_at_period_end").maybeSingle(),
  ])
  const row = sub as Pick<SubscriptionRow, "source" | "status" | "current_period_end" | "cancel_at_period_end"> | null
  const pro = isProActive(row, now)
  const rows = (runs.data ?? []) as { step: string; meta: { purpose?: string } | null }[]
  return {
    plan: pro ? "pro" : "free",
    ...(pro && row
      ? {
          billing: {
            source: row.source,
            periodEnd: row.current_period_end!,
            cancelAtPeriodEnd: row.cancel_at_period_end,
            pastDue: row.status === "past_due",
          },
        }
      : {}),
    used: {
      tailored: tailored.count ?? 0,
      fixes: rows.filter((r) => r.step === "chat" || (r.step === "write" && r.meta?.purpose === "fix")).length,
      updates: rows.filter((r) => r.step === "extract").length,
    },
    resetsAt: nextMonthStart(now).toISOString(),
  }
}

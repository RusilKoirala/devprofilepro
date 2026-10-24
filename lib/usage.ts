import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { isProActive, type SubscriptionRow } from "@/lib/billing/events"
import { monthStart, nextMonthStart, type PlanUsage } from "@/lib/plans"

// This month's usage against the plan allowances, from usage_events (lib/allowance.ts writes them):
//   tailored = tailored resumes saved, fixes = AI rewrites and chat messages that changed a resume,
//   updates  = rebuilds and GitHub/LinkedIn syncs after the first build.
// Failed AI calls never count. The plan comes from the subscriptions row the Dodo webhook keeps.
export async function loadPlanUsage(supabase: SupabaseClient, now = new Date()): Promise<PlanUsage> {
  const since = monthStart(now).toISOString()
  const [events, { data: sub, error: subError }] = await Promise.all([
    supabase.from("usage_events").select("kind").gte("created_at", since),
    supabase.from("subscriptions").select("source,status,current_period_end,cancel_at_period_end").maybeSingle(),
  ])
  const row = sub as Pick<SubscriptionRow, "source" | "status" | "current_period_end" | "cancel_at_period_end"> | null
  const pro = isProActive(row, now)
  const kinds = ((events.data ?? []) as { kind: string }[]).map((e) => e.kind)
  const count = (kind: string) => kinds.filter((k) => k === kind).length
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
      tailored: count("tailored"),
      fixes: count("fixes"),
      updates: count("updates"),
    },
    resetsAt: nextMonthStart(now).toISOString(),
    ...(events.error || subError ? { unavailable: true } : {}),
  }
}

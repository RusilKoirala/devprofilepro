import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { onFastModel } from "@/lib/ai/budget"
import { isProActive, type SubscriptionRow } from "@/lib/billing/events"
import { monthStart, nextMonthStart, type PlanUsage } from "@/lib/plans"

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
  let fastModel = false
  if (pro) {
    const { data: runs } = await supabase.from("ai_runs").select("meta").gte("created_at", `${now.toISOString().slice(0, 10)}T00:00:00Z`)
    fastModel = onFastModel((runs ?? []).reduce((sum, r) => sum + Number((r.meta as { cost_usd?: number })?.cost_usd ?? 0), 0))
  }
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
    ...(fastModel ? { fastModel } : {}),
    ...(events.error || subError ? { unavailable: true } : {}),
  }
}

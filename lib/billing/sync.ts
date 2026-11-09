import "server-only"
import { applyEvent, type BillingEvent, type SubscriptionRow } from "@/lib/billing/events"
import { proProducts } from "@/lib/billing/dodo"
import { createAdminClient } from "@/lib/supabase/admin"

export async function applyBillingEvent(userId: string, event: BillingEvent): Promise<void> {
  const supabase = createAdminClient()
  const { data: existing, error: readError } = await supabase.from("subscriptions").select("*").eq("user_id", userId).maybeSingle()
  if (readError) throw new Error(readError.message)
  const row = applyEvent(event, existing as SubscriptionRow | null, userId, proProducts())
  if (!row) return
  const { error } = await supabase.from("subscriptions").upsert({ ...row, updated_at: new Date().toISOString() })
  if (error) throw new Error(error.message)
}

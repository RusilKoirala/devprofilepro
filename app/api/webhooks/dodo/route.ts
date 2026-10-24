import { NextResponse } from "next/server"
import { clerkClient } from "@clerk/nextjs/server"
import type { BillingEvent } from "@/lib/billing/events"
import { dodo } from "@/lib/billing/dodo"
import { applyBillingEvent } from "@/lib/billing/sync"
import { createAdminClient } from "@/lib/supabase/admin"

const HANDLED = /^(subscription\.|payment\.succeeded$|refund\.succeeded$)/

// Dodo calls this for every billing event. The signature is checked before anything is read,
// each delivery is applied once (keyed by webhook-id), and only subscriptions rows change.
export async function POST(request: Request) {
  const body = await request.text()
  const headers = Object.fromEntries(request.headers)
  let event: { type: string; data: unknown }
  try {
    event = dodo().webhooks.unwrap(body, { headers })
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }
  if (!HANDLED.test(event.type)) return NextResponse.json({ ok: true, ignored: event.type })

  const supabase = createAdminClient()
  const webhookId = headers["webhook-id"] ?? ""
  if (webhookId) {
    const { data: seen } = await supabase.from("billing_events").select("id").eq("id", webhookId).maybeSingle()
    if (seen) return NextResponse.json({ ok: true, duplicate: true })
  }

  try {
    const billingEvent = await withRefundedPayment(event as BillingEvent)
    const userId = await findUser(supabase, billingEvent)
    if (!userId) {
      console.error("dodo webhook: no user for event", event.type)
      // 200 so Dodo doesn't retry forever; the event is logged for a manual fix.
      await supabase.from("billing_events").insert({ id: webhookId || crypto.randomUUID(), type: event.type, user_id: null })
      return NextResponse.json({ ok: true, unmatched: true })
    }
    await applyBillingEvent(userId, billingEvent)
    if (webhookId) await supabase.from("billing_events").insert({ id: webhookId, type: event.type, user_id: userId })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("dodo webhook failed", err)
    // 500 makes Dodo retry the delivery later.
    return NextResponse.json({ error: "Couldn't apply this event" }, { status: 500 })
  }
}

// Refund events name only the payment. Which subscription (and whose) it was comes from the payment.
async function withRefundedPayment(event: BillingEvent): Promise<BillingEvent> {
  if (event.type !== "refund.succeeded") return event
  const payment = await dodo().payments.retrieve(event.data.payment_id)
  return {
    ...event,
    data: { ...event.data, subscription_id: payment.subscription_id ?? null, metadata: { ...payment.metadata, ...event.data.metadata } },
  }
}

// Checkout puts our user id in metadata. A refund issued in Dodo's dashboard is matched to the
// row its payment created, and as a last resort the paying email is looked up in Clerk.
async function findUser(supabase: ReturnType<typeof createAdminClient>, event: BillingEvent): Promise<string | null> {
  const fromMetadata = event.data.metadata?.user_id
  if (typeof fromMetadata === "string" && fromMetadata) return fromMetadata
  if (event.type === "refund.succeeded") {
    const { data } = await supabase.from("subscriptions").select("user_id").eq("dodo_payment_id", event.data.payment_id).maybeSingle()
    if (data?.user_id) return data.user_id as string
  }
  const email = event.data.customer?.email
  if (!email) return null
  const { data: users } = await (await clerkClient()).users.getUserList({ emailAddress: [email], limit: 2 })
  return users.length === 1 ? users[0].id : null
}

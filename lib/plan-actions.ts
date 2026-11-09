"use server"

import { headers } from "next/headers"
import { auth, currentUser } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { dodo, isBillingConfigured, proProducts } from "@/lib/billing/dodo"
import type { SubscriptionEventData } from "@/lib/billing/events"
import { applyBillingEvent } from "@/lib/billing/sync"
import { addLoopsContact } from "@/lib/loops"
import type { ActionResult } from "@/lib/record/actions"
import { createClient } from "@/lib/supabase/server"

async function origin() {
  const h = await headers()
  return process.env.NEXT_PUBLIC_APP_URL ?? h.get("origin") ?? `https://${h.get("host")}`
}

export async function startCheckout(billing: "monthly" | "pass"): Promise<ActionResult<{ url: string } | { joined: true }>> {
  const { userId } = await auth()
  if (!userId) return { ok: false, error: "Not signed in" }
  const user = await currentUser()
  const email = user?.primaryEmailAddress?.emailAddress
  if (!email) return { ok: false, error: "Add an email to your account first." }

  if (!isBillingConfigured()) {
    const joined = await requestPro(billing)
    return joined.ok ? { ok: true, data: { joined: true } } : joined
  }

  try {
    const session = await dodo().checkoutSessions.create({
      product_cart: [{ product_id: billing === "pass" ? proProducts().pass : proProducts().monthly, quantity: 1 }],
      customer: { email, name: user?.fullName || email },
      return_url: `${await origin()}/billing?upgraded=${billing}`,
      metadata: { user_id: userId, billing },
    })
    if (!session.checkout_url) return { ok: false, error: "Checkout didn't start. Try again." }
    return { ok: true, data: { url: session.checkout_url } }
  } catch (err) {
    console.error("dodo checkout failed", err)
    return { ok: false, error: "Couldn't open checkout. Try again in a minute." }
  }
}

export async function openBillingPortal(): Promise<ActionResult<{ url: string }>> {
  const { userId } = await auth()
  if (!userId) return { ok: false, error: "Not signed in" }
  const supabase = await createClient()
  const { data } = await supabase.from("subscriptions").select("dodo_customer_id").maybeSingle()
  if (!data?.dodo_customer_id) return { ok: false, error: "No billing account yet." }
  try {
    const { link } = await dodo().customers.customerPortal.create(data.dodo_customer_id)
    return { ok: true, data: { url: link } }
  } catch (err) {
    console.error("dodo portal failed", err)
    return { ok: false, error: "Couldn't open billing. Try again in a minute." }
  }
}

async function ownSubscription() {
  const supabase = await createClient()
  const { data } = await supabase.from("subscriptions").select("source,status,dodo_payment_id,dodo_subscription_id").maybeSingle()
  return data as { source: "monthly" | "pass"; status: string; dodo_payment_id: string | null; dodo_subscription_id: string | null } | null
}

export async function setCancelAtPeriodEnd(cancel: boolean): Promise<ActionResult> {
  const { userId } = await auth()
  if (!userId) return { ok: false, error: "Not signed in" }
  const sub = await ownSubscription()
  if (sub?.source !== "monthly" || !sub.dodo_subscription_id) return { ok: false, error: "There's no monthly plan to change." }
  try {
    const updated = await dodo().subscriptions.update(sub.dodo_subscription_id, {
      cancel_at_next_billing_date: cancel,
      ...(cancel ? { cancel_reason: "cancelled_by_customer" as const } : {}),
    })
    await applyBillingEvent(userId, { type: "subscription.updated", data: updated as unknown as SubscriptionEventData })
    revalidatePath("/", "layout")
    return { ok: true, data: undefined }
  } catch (err) {
    console.error("dodo cancel toggle failed", err)
    return { ok: false, error: cancel ? "Couldn't cancel. Try again in a minute." : "Couldn't keep Pro on. Try again in a minute." }
  }
}

export async function requestPro(billing: "monthly" | "pass"): Promise<ActionResult> {
  const { userId } = await auth()
  if (!userId) return { ok: false, error: "Not signed in" }
  const email = (await currentUser())?.primaryEmailAddress?.emailAddress
  if (!email) return { ok: false, error: "Add an email to your account first." }
  try {
    await addLoopsContact(email, "pro", `upgrade-${billing === "pass" ? "pass" : "monthly"}`)
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Couldn't save that. Try again." }
  }
}

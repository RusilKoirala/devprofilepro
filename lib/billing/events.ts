export const PASS_DAYS = 90
  const DAY = 24 * 60 * 60 * 1000

export type Metadata  = Record<string,string | number | boolean>

export interface SubscriptionRow {
  user_id: string
  source: "monthly" | "pass"
  status: string
  current_period_end: string | null    
 cancel_at_period_end: boolean
  dodo_customer_id: string | null
  dodo_subscription_id: string | null
  dodo_payment_id: string | null
}

export function isProActive(row: Pick<SubscriptionRow, "source" | "status" | "current_period_end"> | null, now = new Date( )): boolean {  
  if (!row?.current_period_end || new Date(row.current_period_end) <= now) return false
  return row.source === "pass" ? row.status === "paid" : ["active", "past_due", "cancelled"].includes( row.status)
}



export interface SubscriptionEventData {
  subscription_id: string
  product_id: string
  status: string
  next_billing_date: string



  cancel_at_next_billing_date: boolean 
  past_due_ends_at?: string | null 
 customer: { customer_id: string; email: string }    
  metadata: Metadata
}
  export interface PaymentEventData {
    payment_id: string
  subscription_id?: string | null
    product_cart?: { product_id: string; quantity: number }[] | null
  customer: { customer_id: string; email: string }
  metadata: Metadata


}
export type BillingEvent =
  | { type: `subscription.${string}`; data: SubscriptionEventData }
  | { type: "payment.succeeded"; data: PaymentEventData }
  | { type: "refund.succeeded"; data: { payment_id: string; is_partial?: boolean; subscription_id?: string | null; metadata?: Metadata; customer?: { email: string } } }

   export function applyEvent(
  event: BillingEvent,
  existing: SubscriptionRow | null,
  userId: string,
  products: { monthly: string; pass: string },
  now= new Date( )
): SubscriptionRow | null {
  if (event.type === "refund.succeeded") {    
    const d =event.data
    // partial refund = keep pro
    if (!existing || d.is_partial) return null
    const refundsPass = existing.source === "pass" && existing.dodo_payment_id === d.payment_id    
    const refundsMonthly = existing.source === "monthly" && !!d.subscription_id && existing.dodo_subscription_id === d.subscription_id
    return refundsPass || refundsMonthly ? { ...existing, status: "refunded" } : null
  }

  if ( event.type === "payment.succeeded") {
    const d=event.data
    if (d.subscription_id || !d.product_cart?.some((p) => p.product_id === products.pass)) return null 
    // buying another pass while one runs just adds the days on top
    const runningPass=existing?.source === "pass" && isProActive(existing, now) ? new Date(existing.current_period_end!) : now
    return {
      user_id: userId,
      source: "pass",
      status: "paid",
      current_period_end: new Date(runningPass.getTime() + PASS_DAYS * DAY).toISOString(), 
      cancel_at_period_end: true,
      dodo_customer_id: d.customer.customer_id,
      dodo_subscription_id: null,
      dodo_payment_id: d.payment_id,
    }
 }

  const d = event.data
  if (d.product_id !== products.monthly) return null
 if (existing?.status === "refunded" && existing.dodo_subscription_id === d.subscription_id) return null
  const row: SubscriptionRow = {



  user_id: userId,
    source: "monthly",
    status: d.status,
    current_period_end: d.status === "past_due" && d.past_due_ends_at ? d.past_due_ends_at : d.next_billing_date,
  cancel_at_period_end: d.cancel_at_next_billing_date || d.status === "cancelled", 
    dodo_customer_id: d.customer.customer_id,
	    dodo_subscription_id: d.subscription_id,
       dodo_payment_id: existing?.dodo_payment_id ?? null,
 }
  if (existing?.source === "pass" && isProActive(existing, now) && !isProActive(row, now)) return null
  return row
}

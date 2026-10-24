import assert from "node:assert/strict"
import { test } from "node:test"
import { applyEvent, isProActive, type BillingEvent, type SubscriptionRow } from "./events.ts"

const products = { monthly: "pdt_month", pass: "pdt_pass" }
const now = new Date("2026-10-24T12:00:00Z")
const customer = { customer_id: "cus_1", email: "a@b.co" }

function sub(status: string, extra: Partial<BillingEvent["data"]> = {}): BillingEvent {
  return {
    type: `subscription.${status}`,
    data: { subscription_id: "sub_1", product_id: "pdt_month", status, next_billing_date: "2026-11-24T12:00:00Z", cancel_at_next_billing_date: false, customer, metadata: {}, ...extra },
  } as BillingEvent
}
const passPayment: BillingEvent = { type: "payment.succeeded", data: { payment_id: "pay_1", product_cart: [{ product_id: "pdt_pass", quantity: 1 }], customer, metadata: {} } }

test("an active monthly plan is Pro until the next billing date", () => {
  const row = applyEvent(sub("active"), null, "u1", products, now)!
  assert.equal(row.current_period_end, "2026-11-24T12:00:00Z")
  assert.ok(isProActive(row, now))
  assert.ok(!isProActive(row, new Date("2026-11-25T00:00:00Z")))
})

test("cancelling keeps Pro until the paid month ends; on hold and expired end it", () => {
  const cancelled = applyEvent(sub("cancelled"), null, "u1", products, now)!
  assert.ok(isProActive(cancelled, now) && cancelled.cancel_at_period_end)
  assert.ok(!isProActive(applyEvent(sub("on_hold"), null, "u1", products, now), now))
  assert.ok(!isProActive(applyEvent(sub("expired"), null, "u1", products, now), now))
})

test("past due keeps Pro through the grace period", () => {
  const row = applyEvent(sub("past_due", { past_due_ends_at: "2026-10-30T00:00:00Z" } as never), null, "u1", products, now)!
  assert.equal(row.current_period_end, "2026-10-30T00:00:00Z")
  assert.ok(isProActive(row, now))
})

test("the pass grants 90 days, stacks on a running pass, and a refund ends it", () => {
  const first = applyEvent(passPayment, null, "u1", products, now)!
  assert.equal(first.current_period_end, "2027-01-22T12:00:00.000Z")
  const second = applyEvent({ ...passPayment, data: { ...passPayment.data, payment_id: "pay_2" } } as BillingEvent, first, "u1", products, now)!
  assert.equal(second.current_period_end, "2027-04-22T12:00:00.000Z")
  const refunded = applyEvent({ type: "refund.succeeded", data: { payment_id: "pay_2" } }, second, "u1", products, now)!
  assert.ok(!isProActive(refunded, now))
  assert.equal(applyEvent({ type: "refund.succeeded", data: { payment_id: "other" } }, second, "u1", products, now), null)
})

test("monthly charges and other products don't count as the pass", () => {
  assert.equal(applyEvent({ type: "payment.succeeded", data: { ...passPayment.data, subscription_id: "sub_1" } } as BillingEvent, null, "u1", products, now), null)
  assert.equal(applyEvent(sub("active", { product_id: "pdt_other" }), null, "u1", products, now), null)
})

test("a lapsed monthly plan never cuts short a running pass", () => {
  const pass = applyEvent(passPayment, null, "u1", products, now) as SubscriptionRow
  assert.equal(applyEvent(sub("expired"), pass, "u1", products, now), null)
  assert.equal(applyEvent(sub("active"), pass, "u1", products, now)?.source, "monthly")
})

test("refunding a monthly charge ends Pro, and later events for that subscription can't restore it", () => {
  const active = applyEvent(sub("active"), null, "u1", products, now)!
  const refunded = applyEvent({ type: "refund.succeeded", data: { payment_id: "pay_9", subscription_id: "sub_1" } }, active, "u1", products, now)!
  assert.equal(refunded.status, "refunded")
  assert.ok(!isProActive(refunded, now))
  assert.equal(applyEvent(sub("cancelled"), refunded, "u1", products, now), null)
  // A brand-new subscription after the refund works again.
  assert.equal(applyEvent(sub("active", { subscription_id: "sub_2" } as never), refunded, "u1", products, now)?.status, "active")
})

test("partial refunds and refunds of another subscription leave Pro alone", () => {
  const active = applyEvent(sub("active"), null, "u1", products, now)!
  assert.equal(applyEvent({ type: "refund.succeeded", data: { payment_id: "pay_9", subscription_id: "sub_1", is_partial: true } }, active, "u1", products, now), null)
  assert.equal(applyEvent({ type: "refund.succeeded", data: { payment_id: "pay_9", subscription_id: "sub_other" } }, active, "u1", products, now), null)
})

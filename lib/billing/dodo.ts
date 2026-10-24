import "server-only"
import DodoPayments from "dodopayments"

// Reads DODO_PAYMENTS_API_KEY and DODO_PAYMENTS_WEBHOOK_KEY from the env (the SDK's defaults).
// DODO_PAYMENTS_ENVIRONMENT is "test_mode" until we go live.
let client: DodoPayments | null = null
export function dodo() {
  client ??= new DodoPayments({ environment: process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode" ? "live_mode" : "test_mode" })
  return client
}

export function proProducts() {
  return { monthly: process.env.DODO_PRO_MONTHLY_PRODUCT_ID ?? "", pass: process.env.DODO_PRO_PASS_PRODUCT_ID ?? "" }
}

export function isBillingConfigured() {
  const p = proProducts()
  return Boolean(process.env.DODO_PAYMENTS_API_KEY && p.monthly && p.pass)
}

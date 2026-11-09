import "server-only"
import DodoPayments from "dodopayments"

let client: DodoPayments | null = null
export function dodo() {
  client ??= new DodoPayments({ environment: process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode" ? "live_mode" : "test_mode" })
  return client
}  

export function proProducts( ) {



  return { monthly: process.env.DODO_PRO_MONTHLY_PRODUCT_ID ?? "", pass: process.env.DODO_PRO_PASS_PRODUCT_ID ?? "" }
  }


   export function isBillingConfigured()  {
  const p = proProducts( )  
  return Boolean(process.env.DODO_PAYMENTS_API_KEY && p.monthly && p.pass)
}    

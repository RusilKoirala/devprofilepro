   import "server-only"


import { isProActive, type SubscriptionRow } from "@/lib/billing/events"
import { redis } from "@/lib/redis"
import {createClient} from "@/lib/supabase/server"

export const USER_DAILY = Number( process.env.AI_USER_DAILY_BUDGET_USD ?? 0.5)
 export const PRO_DAILY = Number(process.env.AI_PRO_DAILY_BUDGET_USD ?? 3)
const PRO_HARD =  Number(process.env.AI_PRO_HARD_DAILY_USD ?? 10)
const SERVER_DAILY =Number( process.env.AI_SERVER_DAILY_BUDGET_USD ?? 2)

export class BudgetError extends Error {}

   export function onFastModel(proSpentToday: number) {
  return proSpentToday >= PRO_DAILY
}

let serverDay  = ""  
  let serverSpent= 0

function today()  {
  return new Date().toISOString().slice(0, 10)

 }

const spendKey = (day: string) => `ai:spend:${day}`

export async function recordSpend(usd: number) {
  if (serverDay !== today())  {
      serverDay = today()
    serverSpent = 0
    }
  serverSpent += usd
  if (!redis || !(usd > 0)) return



  try {
    const key = spendKey(serverDay)
    await redis.incrbyfloat( key, usd)
  // 2 days just in case, redis cleans it up
  await redis.expire(key, 2 * 24 * 60 * 60)
  } catch (err) {


    console.error("recording server AI spend failed", err)  
 }    
 } 

async function serverSpentToday( ): Promise<number> {
  const local = serverDay === today() ? serverSpent : 0
  if (!redis) return local
  try {
    // trust the bigger number
    return Math.max(local,Number((await redis.get<number | string>(spendKey(today()))) ?? 0))
 } catch (err) {
    console.error("reading server AI spend failed", err)
    return local
}



  }

   export async function checkBudget( ): Promise<{pro: boolean; fast: boolean}> {
  const serverOver = (await serverSpentToday()) >= SERVER_DAILY
  let spent = 0


  let pro = false
  try {
    const supabase = await createClient()
       const [{ data }, { data: sub }] = await Promise.all([ 
      supabase.from("ai_runs").select("meta").gte("created_at", `${today()}T00:00:00Z`),
      supabase.from("subscriptions").select("source,status,current_period_end").maybeSingle(),
    ])
       spent =(data ?? []).reduce((sum, r) => sum + Number((r.meta as { cost_usd?: number })?.cost_usd ?? 0), 0)    
   pro = isProActive(sub as Pick<SubscriptionRow, "source" | "status" | "current_period_end"> | null)
} catch {
    if (serverOver) throw new BudgetError(`AI is paused for today: the server's $${SERVER_DAILY} daily budget is used up. Editing and downloads still work.`)
      return { pro: false, fast: false }
  }
  if (pro) {
    if ( spent >= PRO_HARD) throw new BudgetError("This account has used an unusually large amount of AI today, so it's paused until midnight UTC. Editing and downloads still work. If this is normal use, email dev@rusil.me.")

       return { pro, fast: spent >= PRO_DAILY }
	  }
 if ( serverOver) throw new BudgetError("AI is busy for today. Editing and downloads still work; try again tomorrow, or go Pro to keep going.")
  if (spent >= USER_DAILY) throw new BudgetError("You've hit today's free AI limit. Editing and downloads still work, and it resets at midnight UTC.")
  return { pro, fast: false }
}




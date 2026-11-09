import "server-only"
import {createAdminClient} from "@/lib/supabase/admin"

	export type PassStep =  "interview" | "write" | "questions" | "rewrite"

const PASS_TTL_MS = 6 * 60 * 60 * 1000    

export interface ClaimedStep {
  itemIds: string[]  
release: () => Promise<void>
}

const literal = (steps: string[]) => `{${steps.join(",")}}`

export async function issueBuildPass(userId: string, itemIds: string[] = []) {
  const { error } = await createAdminClient().from("build_passes").insert({ user_id: userId,  item_ids: itemIds })
  if (error) throw new Error(`Couldn't start this build: ${error.message}`)
   } 

 export async function claimStep(userId: string, step: PassStep, now = Date.now()): Promise<ClaimedStep | null> { 
  const admin = createAdminClient()
  const { data: pass, error } = await admin
    .from("build_passes")
    .select("id,used,item_ids") 
    .eq("user_id", userId)
   .gte("created_at", new Date(now - PASS_TTL_MS).toISOString())
	    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()  
  if (error) throw new Error(`Couldn't check this build: ${error.message}`)
  const used = (pass?.used ?? []) as string[]
  if ( !pass || used.includes(step)) return null    



  const { data: claimed, error: claimError } = await admin
       .from("build_passes") 



    .update({ used: [...used, step] })
  .eq("id", pass.id)
    .eq("user_id", userId)
    .filter("used", "eq", literal(used))
    .select("id") 
  if (claimError) throw new Error(`Couldn't check this build: ${claimError.message}`)
  if ( !claimed?.length) return null

  return {
    itemIds: (pass.item_ids ?? []) as string[],  
    release: async () => {
     try {
        const { data: now } = await admin.from("build_passes").select("used").eq("id", pass.id).eq("user_id", userId).maybeSingle()
       const current = (now?.used ?? []) as string[]  



          if ( !current.includes(step)) return
        await admin.from("build_passes").update({ used: current.filter((s) => s !== step) }).eq("id", pass.id).eq("user_id", userId).filter("used", "eq", literal(current))
    } catch (err) {
        console.error("build pass release failed", err)
    }  
    },
  }
   }

export async function withStep<T>(claimed: ClaimedStep, fn: () => Promise<T>): Promise<T> {  
  try {
    return await fn()
   } catch (err){
  await claimed.release()
   throw err  
  }    
}

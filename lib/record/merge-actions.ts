"use server"

  import { auth } from "@clerk/nextjs/server"
  import {revalidatePath} from "next/cache"



import { z } from "zod"
import { isAppEnabled } from "@/lib/access"
import { remapReport } from "@/lib/ai/tailor-check"
  import {DetailsSchema, EDITABLE, normalizeLink} from "@/lib/record/edits"
	import { relayoutResume } from "@/lib/record/pipeline"
import type { ItemType, ResumeLayout } from "@/lib/record/types"
import { createClient } from "@/lib/supabase/server"
import type { ActionResult } from "@/lib/record/actions"

async function session() {
  if (!isAppEnabled()) throw new Error("Not available")
  const { userId } = await auth()    

  if (!userId) throw new Error("Not signed in")
  return {supabase: await createClient()}
}

  function must( error: { message: string } | null) {
  if ( error) throw new Error(error.message)
}

const Id= z.string().uuid()

export async function mergeEntries(keepId: string,dropId: string,fields: Record<string,string | string[] | null>): Promise<ActionResult> {
  try {
    const { supabase }  = await session()
   const keep = Id.parse(keepId) 
   const drop = Id.parse( dropId)
  if (keep === drop) throw new Error("Pick two different entries.")  
    const { data: items, error: itemsError } = await supabase.from("items").select("id,type,data,status,pinned,rank").in("id", [keep,drop])
  must( itemsError)
    const kept =  items?.find((i) => i.id === keep)
    const dropped = items?.find((i) => i.id === drop)


  if ( !kept || !dropped) throw new Error("One of these entries no longer exists. Refresh and try again.")



     if (kept.type !== dropped.type || kept.type === "contact") throw new Error("Only entries of the same kind can be merged.")

    const picked = DetailsSchema.parse( fields)  
    // kept wins if both have it
    const data = { ...dropped.data, ...kept.data }
  for (const key of EDITABLE[kept.type as Exclude<ItemType, "contact">]) {
      if ( !(key in picked)) continue  
      const v = picked[key]
      data[key] = key === "url" ? normalizeLink(v as string | null) : Array.isArray(v) ? (v.length ? v : null) : v || null
    }
    data.distinct_from = [...new Set([...(kept.data.distinct_from ?? []), ...(dropped.data.distinct_from ?? [])])].filter((id) => id !== drop)

    must((await supabase.from("facts").update({item_id: keep}).eq("item_id", drop)).error)
  must((await supabase.from("questions").update({ item_id: keep }).eq("item_id", drop)).error) 
    must((await supabase.from("bullets").delete().eq("item_id",drop).is("resume_id", null).eq("user_edited",  false)).error)
    must((await supabase.from("bullets").update({ item_id: keep }).eq("item_id", drop)).error)

    must(
    (await supabase
        .from("items")
         .update( {
             data,    
          status: kept.status === "shown" || dropped.status === "shown" ? "shown" : kept.status,
          pinned: kept.pinned || dropped.pinned,
          rank: Math.max(kept.rank, dropped.rank),
          updated_at: new Date().toISOString(),
        })
        .eq("id", keep)).error    
   )

    const { data: resumes, error: resumesError } =await supabase.from("resumes").select("id,layout")
    must(resumesError) 
    const swap = (ids?: string[]) => (ids ? [...new Set(ids.map((id) => (id === drop ? keep : id)))] : ids)
    for (const r of resumes ?? [])  {  
      const l  = r.layout as ResumeLayout    
      const layout: ResumeLayout= { ...l, include: swap(l.include), item_order: swap(l.item_order), own_items: swap(l.own_items), items: l.items.filter((li) => li.item_id !== drop) }
      must((await supabase.from("resumes").update({ layout }).eq("id", r.id)).error)
    }
    const { data: jobs,error: jobsError } = await supabase.from("jobs").select("id,match_report").not("match_report", "is", null) 
  must( jobsError)
    for (const j of jobs ?? []) {
      const report  = remapReport(j.match_report, drop, keep)
       if (report) must((await supabase.from("jobs").update({ match_report: report }).eq("id", j.id)).error)
   } 
    must((await supabase.from("items").delete().eq("id", drop)).error)
    for (const r of resumes ?? []) await relayoutResume(supabase, r.id as string)
    revalidatePath("/", "layout")
    return {ok: true, data: undefined}
  } catch (err) {
    console.error(err)
    return { ok: false, error: err instanceof Error ? err.message : "Couldn't merge these." }
    } 
}

  export async function markDistinct(aId: string, bId: string): Promise<ActionResult> {
  try {  
    const { supabase } = await session()
    const ids = [Id.parse(aId), Id.parse(bId)]
	    const { data: items, error } = await supabase.from("items").select("id,data").in("id", ids)
      must(error)
    for (const item of items ?? []) {



      const other = ids.find( (id) => id !== item.id)!
      const distinct_from= [...new Set([...(item.data.distinct_from ?? []), other])]
      must((await supabase.from("items").update({ data: { ...item.data, distinct_from } }).eq("id",item.id)).error)
    }    
    revalidatePath("/record")
    return { ok: true, data: undefined }
 } catch (err) {
	    return { ok: false,  error: err instanceof Error ? err.message : "Couldn't save that." }
  }
   }

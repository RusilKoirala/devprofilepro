"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { isAppEnabled } from "@/lib/access"
import { deleteUserData, scrubAiRuns } from "@/lib/record/delete-user-data"
import { relayoutResume } from "@/lib/record/pipeline"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import type { ActionResult } from "@/lib/record/actions"

// The user's control over what we keep: remove one source and everything that came only from it,
// or delete all of their DevProfile data. Billing records stay with the payment provider.

async function session() {
  if (!isAppEnabled()) throw new Error("Not available")
  const { userId } = await auth()
  if (!userId) throw new Error("Not signed in")
  return { userId, supabase: await createClient() }
}

function must(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

function fail(err: unknown): { ok: false; error: string } {
  console.error(err)
  return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" }
}

// Facts read from this source go; lines that cited only them go; entries left with no facts go.
// Lines that also cite other facts stay, citing those, but are flagged for review: "Built the API
// and cut latency 40%" may now rest on the API fact alone. Every resume is re-fitted afterwards.
// PDFs already downloaded are snapshots and don't change.
export async function removeSource(sourceId: string): Promise<ActionResult<{ facts: number; entries: number; review: number }>> {
  try {
    const { supabase } = await session()
    const id = z.string().uuid().parse(sourceId)
    const { data: source, error: sourceError } = await supabase.from("sources").select("id,file_path").eq("id", id).single()
    must(sourceError)
    const { data: facts, error: factsError } = await supabase.from("facts").select("id,item_id").eq("source_id", id)
    must(factsError)
    const gone = new Set((facts ?? []).map((f) => f.id as string))
    const touchedItems = [...new Set((facts ?? []).map((f) => f.item_id as string))]
    let flagged = 0

    if (gone.size) {
      const { data: bullets, error: bulletsError } = await supabase.from("bullets").select("id,item_id,fact_ids").overlaps("fact_ids", [...gone])
      must(bulletsError)
      const review = new Map<string, string[]>()
      for (const b of bullets ?? []) {
        const keep = (b.fact_ids as string[]).filter((f) => !gone.has(f))
        must(keep.length ? (await supabase.from("bullets").update({ fact_ids: keep }).eq("id", b.id)).error : (await supabase.from("bullets").delete().eq("id", b.id)).error)
        if (keep.length) flagged++
        if (keep.length) review.set(b.item_id as string, [...(review.get(b.item_id as string) ?? []), b.id as string])
      }
      if (review.size) {
        const { data: items, error: itemsError } = await supabase.from("items").select("id,data").in("id", [...review.keys()])
        must(itemsError)
        for (const item of items ?? []) {
          const review_lines = [...new Set([...(item.data.review_lines ?? []), ...review.get(item.id as string)!])]
          must((await supabase.from("items").update({ data: { ...item.data, review_lines } }).eq("id", item.id)).error)
        }
      }
      must((await supabase.from("facts").delete().in("id", [...gone])).error)
    }

    // Entries that now have no facts at all came only from this source.
    let entries = 0
    if (touchedItems.length) {
      const { data: left, error: leftError } = await supabase.from("facts").select("item_id").in("item_id", touchedItems)
      must(leftError)
      const stillBacked = new Set((left ?? []).map((f) => f.item_id as string))
      const empty = touchedItems.filter((i) => !stillBacked.has(i))
      if (empty.length) {
        must((await supabase.from("items").delete().in("id", empty).neq("type", "contact")).error)
        entries = empty.length
      }
    }

    must((await supabase.from("sources").delete().eq("id", id)).error)
    if (source?.file_path) {
      const { error } = await supabase.storage.from("uploads").remove([source.file_path])
      if (error) console.error(error)
    }

    const { data: resumes, error: resumesError } = await supabase.from("resumes").select("id")
    must(resumesError)
    for (const r of resumes ?? []) await relayoutResume(supabase, r.id as string)
    revalidatePath("/", "layout")
    return { ok: true, data: { facts: gone.size, entries, review: flagged } }
  } catch (err) {
    return fail(err)
  }
}

// Everything: sources and uploaded files, the Career Record, resumes, job posts, downloaded PDFs
// and the AI log. The sign-in account itself is deleted from the account menu.
export async function deleteAllData(confirm: string): Promise<ActionResult> {
  try {
    const { userId, supabase } = await session()
    if (confirm !== "DELETE") throw new Error('Type DELETE to confirm.')
    await deleteUserData(supabase, userId)
    // The AI log needs the service key, filtered to the signed-in user's id only.
    await scrubAiRuns(createAdminClient(), userId)
    revalidatePath("/", "layout")
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

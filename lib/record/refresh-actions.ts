"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { isAppEnabled } from "@/lib/access"
import { checkBullet, writeBullets } from "@/lib/ai/write"
import { loadRecord } from "@/lib/record/db"
import { relayoutResume } from "@/lib/record/pipeline"
import { itemTitle, type Fact } from "@/lib/record/types"
import { sharedBullets } from "@/lib/resume/order"
import { createClient } from "@/lib/supabase/server"
import type { ActionResult } from "@/lib/record/actions"

// After a sync adds facts to entries that already have lines: suggest new wording, and apply only
// what the person approves. Entries with lines they edited by hand are never touched here.

async function session() {
  if (!isAppEnabled()) throw new Error("Not available")
  const { userId } = await auth()
  if (!userId) throw new Error("Not signed in")
  return { userId, supabase: await createClient() }
}

function fail(err: unknown): { ok: false; error: string } {
  console.error(err)
  return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" }
}

export interface RewriteProposal {
  itemId: string
  title: string
  before: string[]
  after: { text: string; fact_ids: string[] }[]
}

export async function proposeRewrites(itemIds: string[]): Promise<ActionResult<{ proposals: RewriteProposal[]; skipped: string[] }>> {
  try {
    const { userId, supabase } = await session()
    const ids = z.array(z.string().uuid()).max(30).parse(itemIds)
    const record = await loadRecord(supabase)
    const shared = sharedBullets(record.bullets)
    const candidates = record.items.filter((i) => ids.includes(i.id) && i.status !== "hidden" && shared.some((b) => b.item_id === i.id))
    // Hand-edited wording stays the person's; say so instead of rewriting around it.
    const edited = candidates.filter((i) => shared.some((b) => b.item_id === i.id && b.user_edited))
    const items = candidates.filter((i) => !edited.includes(i))
    if (!items.length) return { ok: true, data: { proposals: [], skipped: edited.map(itemTitle) } }

    const { data: base } = await supabase.from("resumes").select("layout").eq("kind", "base").maybeSingle()
    const { bullets } = await writeBullets({ userId, items, facts: record.facts, targetRole: base?.layout?.target_role })
    const proposals = items
      .map((i) => ({
        itemId: i.id,
        title: itemTitle(i),
        before: shared.filter((b) => b.item_id === i.id).map((b) => b.text),
        after: bullets.filter((b) => b.item_id === i.id).map(({ text, fact_ids }) => ({ text, fact_ids })),
      }))
      .filter((p) => p.after.length && p.after.map((b) => b.text).join("\n") !== p.before.join("\n"))
    return { ok: true, data: { proposals, skipped: edited.map(itemTitle) } }
  } catch (err) {
    return fail(err)
  }
}

const Lines = z.array(z.object({ text: z.string().trim().min(3).max(400), fact_ids: z.array(z.string().uuid()).min(1).max(10) })).min(1).max(8)

// The approved lines came back through the browser, so every one is checked again here.
export async function applyRewrite(itemId: string, lines: { text: string; fact_ids: string[] }[]): Promise<ActionResult> {
  try {
    const { supabase } = await session()
    const id = z.string().uuid().parse(itemId)
    const parsed = Lines.parse(lines)
    const record = await loadRecord(supabase)
    const facts = new Map<string, Fact>(record.facts.filter((f) => f.item_id === id).map((f) => [f.id, f]))
    const problems = parsed.flatMap((b) => checkBullet({ item_id: id, ...b }, facts))
    if (problems.length) throw new Error("These lines no longer match your facts. Sync again for fresh suggestions.")
    if (sharedBullets(record.bullets).some((b) => b.item_id === id && b.user_edited)) throw new Error("You've edited this entry's lines yourself, so we left them as they are.")
    const { error } = await supabase.rpc("replace_generated_bullets", { p_item_ids: [id], p_bullets: parsed.map((b) => ({ item_id: id, ...b })), p_release_edits: false })
    if (error) throw new Error(error.message)
    const { data: resumes, error: resumesError } = await supabase.from("resumes").select("id")
    if (resumesError) throw new Error(resumesError.message)
    for (const r of resumes ?? []) await relayoutResume(supabase, r.id as string)
    revalidatePath("/", "layout")
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

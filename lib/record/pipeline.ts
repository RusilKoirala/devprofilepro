import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { extractRecord } from "@/lib/ai/extract"
import { generateQuestions, MAX_QUESTIONS } from "@/lib/ai/questions"
import { writeBullets } from "@/lib/ai/write"
import { loadRecord, type CareerRecord } from "@/lib/record/db"
import { dedupeKey, type CutEntry, type Item, type ItemType, type ResumeLayout } from "@/lib/record/types"
import { groundItemData, looksImportant, verifyFacts } from "@/lib/record/verify"
import type { RepoMeta } from "@/lib/ingest/types"
import { DEFAULT_SECTION_ORDER } from "@/lib/resume/build"
import { fitToOnePage } from "@/lib/resume/fit"

export interface BuildReport {
  items: number
  factsKept: number
  factsDropped: number
  skippedReadmes: string[]
}

// ② Extract + rank → ③ quote check → save to the Career Record.
export async function buildRecord(supabase: SupabaseClient, userId: string): Promise<BuildReport> {
  const record = await loadRecord(supabase)
  const sources = record.sources.filter((s) => s.kind !== "win" && s.status !== "failed" && s.raw_text)
  if (!sources.length) {
    if (record.items.length) return { items: record.items.length, factsKept: 0, factsDropped: 0, skippedReadmes: [] }
    throw new Error("Add at least one source first.")
  }

  const { output, skipped } = await extractRecord(userId, sources)
  const rawById = new Map(sources.map((s) => [s.id, s.raw_text]))
  const kindById = new Map(sources.map((s) => [s.id, s.kind]))

  // Imports are additive. Deleting accepted items here invalidates existing
  // layouts if writing or rendering subsequently fails, and loses hide choices.
  const byKey = new Map(record.items.map((i) => [dedupeKey(i), i.id]))
  const existingFactTexts = new Set(record.facts.map((f) => `${f.item_id}:${f.text.toLowerCase()}`))
  let factsKept = 0
  let factsDropped = 0
  const questionRows: { item_id: string; prompt: string; kind: string; options: string[] }[] = []

  for (const extracted of output.items) {
    const { kept, dropped } = verifyFacts(extracted.facts, rawById)

    // GitHub signals become facts with no AI, for repos this item cites.
    const repoSources = new Set(kept.map((f) => f.source_id).filter((id) => sources.find((s) => s.id === id)?.meta?.repo_id))
    const signals = [...repoSources].flatMap((sid) =>
      ((sources.find((s) => s.id === sid)?.meta as unknown as RepoMeta).signals ?? []).map((sig) => ({ text: sig.text, quote: sig.quote, source_id: sid }))
    )
    const allFacts = [...kept, ...verifyFacts(signals, rawById).kept]
    const teamProject = extracted.team_project || [...repoSources].some((sid) => Number(sources.find((s) => s.id === sid)?.meta?.contributors ?? 0) > 1)
    factsKept += allFacts.length
    factsDropped += dropped.length
    if (!allFacts.length) continue

    const sourceTexts = [...new Set(kept.map((f) => f.source_id))].map((id) => rawById.get(id)!)
    const data = groundItemData(extracted.data, sourceTexts)
    const candidate = { type: extracted.type, data } as Pick<Item, "type" | "data">
    let itemId = byKey.get(dedupeKey(candidate))
    if (!itemId) {
      const { data: itemRow, error } = await supabase
        .from("items")
        .insert({ type: extracted.type, data: { ...data, team_project: teamProject }, rank: Math.max(1, Math.min(100, extracted.rank)), status: extracted.show ? "shown" : "hidden", reason: extracted.reason })
        .select("id")
        .single()
      if (error) throw new Error(error.message)
      itemId = itemRow.id as string
      byKey.set(dedupeKey(candidate), itemId)
    } else {
      // A later source may supply a previously missing email, date or link.
      // Fill blanks while retaining the accepted values already on the item.
      const existing = record.items.find((i) => i.id === itemId)
      if (existing) {
        const merged = { ...data, ...existing.data }
        for (const [key, value] of Object.entries(data)) {
          const old = existing.data[key as keyof typeof data]
          if (old == null || old === "" || (Array.isArray(old) && !old.length)) Object.assign(merged, { [key]: value })
        }
        if (JSON.stringify(merged) !== JSON.stringify(existing.data)) {
          const { error } = await supabase.from("items").update({ data: merged, updated_at: new Date().toISOString() }).eq("id", itemId)
          if (error) throw new Error(error.message)
        }
      }
    }

    const factRows = allFacts
      .flatMap((f) => {
        if (existingFactTexts.has(`${itemId}:${f.text.toLowerCase()}`)) return []
        existingFactTexts.add(`${itemId}:${f.text.toLowerCase()}`)
        const kind = kindById.get(f.source_id)
        return [{ item_id: itemId, text: f.text, quote: f.quote, source_id: f.source_id, label: kind === "github" || kind === "pr_link" ? "github" : "document" }]
      })
    if (factRows.length) {
      const { error } = await supabase.from("facts").insert(factRows)
      if (error) throw new Error(error.message)
    }

    if (teamProject && !record.items.find((i) => i.id === itemId)?.data.ownership_confirmed) {
      questionRows.push({ item_id: itemId, prompt: `What did you personally build in ${data.name || "this team project"}?`, kind: "ownership", options: [] })
    }

    // A dropped fact that looked important becomes a question instead of disappearing.
    for (const d of dropped.filter((f) => looksImportant(f.text)).slice(0, 1)) {
      questionRows.push({ item_id: itemId, prompt: `We couldn't find this in your files: "${d.text}". Is it right?`, kind: "conflict", options: ["Yes, that's right", "No"] })
    }
  }

  const open = record.questions.filter((q) => q.status === "open")
  const fresh = questionRows.filter((q) => !record.questions.some((old) => old.item_id === q.item_id && old.prompt === q.prompt))
  if (fresh.length && open.length < MAX_QUESTIONS) {
    const { error } = await supabase.from("questions").insert(fresh.slice(0, Math.min(2, MAX_QUESTIONS - open.length)))
    if (error) throw new Error(error.message)
  }

  return { items: output.items.length, factsKept, factsDropped, skippedReadmes: skipped }
}

// ④ Questions (A2), topping up to MAX_QUESTIONS open questions.
export async function refreshQuestions(supabase: SupabaseClient, userId: string) {
  const record = await loadRecord(supabase)
  const open = record.questions.filter((q) => q.status === "open")
  const room = MAX_QUESTIONS - open.length
  if (room <= 0) return
  const asked = new Set(record.questions.map((q) => q.prompt.toLowerCase()))
  const fresh = (await generateQuestions(userId, record.items, record.facts)).filter((q) => !asked.has(q.prompt.toLowerCase())).slice(0, room)
  if (fresh.length) {
    const { error } = await supabase.from("questions").insert(fresh)
    if (error) throw new Error(error.message)
  }
}

// ⑤ Write (A3) for some or all shown items, replacing bullets the user didn't edit.
export async function writeItems(supabase: SupabaseClient, userId: string, record: CareerRecord, itemIds?: string[], targetRole?: string, releaseEdits = false) {
  const items = record.items.filter((i) => i.status !== "hidden" && (!itemIds || itemIds.includes(i.id)))
  const keep = record.bullets.filter((b) => b.user_edited)
  const keepItems = new Set(keep.map((b) => b.item_id))
  // Rebuilding writes only newly imported items. Existing wording changes only
  // when the user answers a question or explicitly requests regeneration.
  const toWrite = items.filter((i) => (releaseEdits || !keepItems.has(i.id)) && (itemIds || !record.bullets.some((b) => b.item_id === i.id)))
  const { headline, bullets } = await writeBullets({ userId, items: toWrite, facts: record.facts, keep: releaseEdits ? [] : keep, targetRole })

  const writtenIds = [...new Set(bullets.map((b) => b.item_id))]
  if (writtenIds.length) {
    // Atomic replacement also maintains layout references. A failed insert
    // must leave the previous bullets and edited flags intact.
    const { error } = await supabase.rpc("replace_generated_bullets", { p_item_ids: writtenIds, p_bullets: bullets, p_release_edits: releaseEdits })
    if (error) throw new Error(error.message)
  }
  return headline
}

export function defaultLayout(record: Pick<CareerRecord, "items" | "bullets">, headline: string): ResumeLayout {
  const shown = record.items.filter((i) => i.status !== "hidden" && i.type !== "contact")
  const hasJobs = shown.some((i) => i.type === "job")
  const section_order: ItemType[] = hasJobs ? DEFAULT_SECTION_ORDER : ["education", "project", "job", "skills", "award"]
  return {
    headline,
    section_order,
    items: shown
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.rank - a.rank)
      .map((i) => ({ item_id: i.id, bullet_ids: record.bullets.filter((b) => b.item_id === i.id).map((b) => b.id) })),
  }
}

// ⑥ Fit, then save the layout and what was cut.
export async function fitAndSave(supabase: SupabaseClient, resumeId: string, layout: ResumeLayout, record: Pick<CareerRecord, "items" | "bullets">) {
  const fit = await fitToOnePage(layout, record)
  const { error } = await supabase
    .from("resumes")
    .update({ layout: fit.layout, cut_log: fit.cuts satisfies CutEntry[], updated_at: new Date().toISOString() })
    .eq("id", resumeId)
  if (error) throw new Error(error.message)
  return fit
}

// The whole first-run flow: ②→⑥. Returns the base resume id.
export async function buildBaseResume(supabase: SupabaseClient, userId: string): Promise<{ resumeId: string; report: BuildReport }> {
  const report = await buildRecord(supabase, userId)
  let record = await loadRecord(supabase)
  if (!record.items.length) throw new Error("We couldn't verify any facts. Add clearer notes or another source and try again.")
  const headline = await writeItems(supabase, userId, record)
  // Questions run after the first draft is written, so the user sees a draft first.
  await refreshQuestions(supabase, userId).catch(() => {})
  record = await loadRecord(supabase)

  const layout = defaultLayout(record, headline)
  const { data: existing, error: existingError } = await supabase.from("resumes").select("id,layout").eq("kind", "base").maybeSingle()
  if (existingError) throw new Error(existingError.message)
  if (existing?.layout?.headline) layout.headline = existing.layout.headline
  let resumeId = existing?.id as string | undefined
  if (!resumeId) {
    const { data, error } = await supabase.from("resumes").insert({ kind: "base", title: "Base resume", layout }).select("id").single()
    if (error) throw new Error(error.message)
    resumeId = data.id as string
  }
  await fitAndSave(supabase, resumeId, layout, record)
  return { resumeId, report }
}

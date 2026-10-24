import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { extractRecord } from "@/lib/ai/extract"
import { generateInterview, interviewItems } from "@/lib/ai/interview"
import { generateQuestions, MAX_QUESTIONS } from "@/lib/ai/questions"
import { writeBullets } from "@/lib/ai/write"
import { loadRecord, loadResume, type CareerRecord } from "@/lib/record/db"
import { dedupeKey, itemTitle, type CutEntry, type Item, type ItemType, type ResumeLayout } from "@/lib/record/types"
import { sameFact } from "@/lib/record/dedupe"
import { groundItemData, looksImportant, verifyFacts } from "@/lib/record/verify"
import type { RepoMeta } from "@/lib/ingest/types"
import { byRecency } from "@/lib/resume/dates"
import { applyItemOrder } from "@/lib/resume/order"
import { fitToOnePage } from "@/lib/resume/fit"

export interface BuildReport {
  items: number
  factsKept: number
  factsDropped: number
  skippedReadmes: string[]
  // What the Career Record holds after this build, shown as "Found 2 jobs, 5 projects…"
  counts: Partial<Record<ItemType, number>>
  // What this build changed: new entries, and existing entries that gained facts.
  added: string[]
  updated: string[]
}

function countItems(items: Pick<Item, "type" | "status">[]): BuildReport["counts"] {
  const counts: BuildReport["counts"] = {}
  for (const i of items) if (i.status !== "hidden") counts[i.type] = (counts[i.type] ?? 0) + 1
  return counts
}

// ② Extract + rank → ③ quote check → save to the Career Record.
export async function buildRecord(supabase: SupabaseClient, userId: string): Promise<BuildReport> {
  const record = await loadRecord(supabase)
  const sources = record.sources.filter((s) => s.kind !== "win" && s.status !== "failed" && s.raw_text)
  if (!sources.length) {
    if (record.items.length) return { items: record.items.length, factsKept: 0, factsDropped: 0, skippedReadmes: [], counts: countItems(record.items), added: [], updated: [] }
    throw new Error("Add at least one source first.")
  }

  const { output, skipped } = await extractRecord(userId, sources)
  const rawById = new Map(sources.map((s) => [s.id, s.raw_text]))
  const kindById = new Map(sources.map((s) => [s.id, s.kind]))

  // Imports are additive. Deleting accepted items here invalidates existing
  // layouts if writing or rendering subsequently fails, and loses hide choices.
  const byKey = new Map(record.items.map((i) => [dedupeKey(i), i.id]))
  // Facts already on each item, including ones added earlier in this build. A reworded copy of one
  // (the AI phrases facts a little differently on every read) is skipped, not saved again.
  const factsByItem = new Map<string, string[]>()
  for (const f of record.facts) factsByItem.set(f.item_id, [...(factsByItem.get(f.item_id) ?? []), f.text])
  let factsKept = 0
  let factsDropped = 0
  const added = new Set<string>()
  const updated = new Set<string>()
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
      if (extracted.type !== "contact") added.add(itemTitle(candidate))
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
        const known = factsByItem.get(itemId!) ?? []
        if (known.some((t) => sameFact(t, f.text))) return []
        factsByItem.set(itemId!, [...known, f.text])
        const kind = kindById.get(f.source_id)
        return [{ item_id: itemId, text: f.text, quote: f.quote, source_id: f.source_id, label: kind === "github" || kind === "pr_link" ? "github" : "document" }]
      })
    if (factRows.length) {
      const { error } = await supabase.from("facts").insert(factRows)
      if (error) throw new Error(error.message)
      const existing = record.items.find((i) => i.id === itemId)
      if (existing && existing.type !== "contact") updated.add(itemTitle(existing))
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

  const { data: after, error: afterError } = await supabase.from("items").select("type,status")
  if (afterError) throw new Error(afterError.message)
  return {
    items: output.items.length, factsKept, factsDropped, skippedReadmes: skipped, counts: countItems(after as Pick<Item, "type" | "status">[]),
    added: [...added], updated: [...updated].filter((t) => !added.has(t)),
  }
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

export interface InterviewCard {
  id: string
  item_id: string
  item_title: string
  kind: string
  prompt: string
  options: string[]
}

// ④ Interview (before writing): a few tappable questions about what the person built and what
// changed, on their strongest entries. Bare ownership questions from the import are upgraded in
// place (with options) rather than asked twice. Returns every open question on those entries.
export async function queueInterview(supabase: SupabaseClient, userId: string): Promise<InterviewCard[]> {
  const record = await loadRecord(supabase)
  const picked = interviewItems(record.items)
  const pickedIds = new Set(picked.map((i) => i.id))
  const openOwnership = new Map(record.questions.filter((q) => q.status === "open" && q.kind === "ownership").map((q) => [q.item_id, q]))
  const asked = record.questions.filter((q) => !(q.status === "open" && q.kind === "ownership"))
  const fresh = await generateInterview(userId, record.items, record.facts, asked)

  const known = new Set(record.questions.map((q) => q.prompt.toLowerCase()))
  const inserts: { item_id: string; prompt: string; kind: string; options: string[] }[] = []
  for (const q of fresh) {
    const existing = (q.kind === "ownership" || q.kind === "built") && openOwnership.get(q.item_id)
    if (existing) {
      const { error } = await supabase.from("questions").update({ prompt: q.prompt, options: q.options }).eq("id", existing.id)
      if (error) throw new Error(error.message)
      openOwnership.delete(q.item_id)
    } else if (!known.has(q.prompt.toLowerCase())) {
      inserts.push(q)
      known.add(q.prompt.toLowerCase())
    }
  }
  if (inserts.length) {
    const { error } = await supabase.from("questions").insert(inserts)
    if (error) throw new Error(error.message)
  }

  const after = await loadRecord(supabase)
  const titles = new Map(after.items.map((i) => [i.id, itemTitle(i)]))
  const order = new Map(picked.map((i, n) => [i.id, n]))
  return after.questions
    .filter((q) => q.status === "open" && pickedIds.has(q.item_id))
    .sort((a, b) => order.get(a.item_id)! - order.get(b.item_id)!)
    .map((q) => ({ id: q.id, item_id: q.item_id, item_title: titles.get(q.item_id) ?? "", kind: q.kind ?? "", prompt: q.prompt, options: q.options ?? [] }))
}

// ⑤ Write (A3) for some or all shown items, replacing bullets the user didn't edit.
export async function writeItems(
  supabase: SupabaseClient,
  userId: string,
  record: CareerRecord,
  opts: { itemIds?: string[]; targetRole?: string; releaseEdits?: boolean; instruction?: string; purpose?: "fix" } = {}
) {
  const { itemIds, targetRole, releaseEdits = false, instruction, purpose } = opts
  const items = record.items.filter((i) => i.status !== "hidden" && (!itemIds || itemIds.includes(i.id)))
  const keep = record.bullets.filter((b) => b.user_edited)
  const keepItems = new Set(keep.map((b) => b.item_id))
  // Rebuilding writes only newly imported items. Existing wording changes only
  // when the user answers a question or explicitly requests regeneration.
  const toWrite = items.filter((i) => (releaseEdits || !keepItems.has(i.id)) && (itemIds || !record.bullets.some((b) => b.item_id === i.id)))
  const { headline, bullets } = await writeBullets({ userId, items: toWrite, facts: record.facts, keep: releaseEdits ? [] : keep, targetRole, instruction, purpose })

  const writtenIds = [...new Set(bullets.map((b) => b.item_id))]
  if (writtenIds.length) {
    // Atomic replacement also maintains layout references. A failed insert
    // must leave the previous bullets and edited flags intact.
    const { error } = await supabase.rpc("replace_generated_bullets", { p_item_ids: writtenIds, p_bullets: bullets, p_release_edits: releaseEdits })
    if (error) throw new Error(error.message)
  }
  return { headline, written: bullets.length }
}

// Students and interns lead with Education; working developers lead with Experience;
// no job history means Projects come before the (empty) Experience section.
export function sectionOrder(items: Pick<Item, "type" | "status" | "data">[]): ItemType[] {
  const jobs = items.filter((i) => i.type === "job" && i.status !== "hidden")
  if (!jobs.length) return ["education", "project", "skills", "award", "job"]
  const early = jobs.every((j) => /\b(intern|internship|trainee|apprentice|student|teaching assistant|research assistant)\b/i.test(j.data.role ?? ""))
  return early ? ["education", "job", "project", "skills", "award"] : ["job", "project", "education", "skills", "award"]
}

// Default order: jobs and schools newest first, projects, skills and awards strongest first.
// A drag in the editor overrides it (layout.item_order).
export function orderItems<T extends Pick<Item, "type" | "rank" | "data">>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const dated = (t: string) => t === "job" || t === "education"
    if (a.type === b.type && dated(a.type)) return byRecency(a.data, b.data) || b.rank - a.rank
    return b.rank - a.rank
  })
}

export function defaultLayout(record: Pick<CareerRecord, "items" | "bullets">, headline: string, include?: string[]): ResumeLayout {
  const picked = include ? new Set(include) : null
  const shown = record.items.filter((i) => i.type !== "contact" && (picked ? picked.has(i.id) : i.status !== "hidden"))
  return {
    headline,
    section_order: sectionOrder(shown),
    items: orderItems(shown).map((i) => ({ item_id: i.id, bullet_ids: record.bullets.filter((b) => b.item_id === i.id).map((b) => b.id) })),
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

// The first-run flow is split into stages so the client can show real progress:
// extract (buildRecord) → write (writeBase) → questions (refreshQuestions) → fit (fitBase).

// ⑤ Write bullets for new items and create/update the base resume's layout.
export async function writeBase(supabase: SupabaseClient, userId: string, targetRole?: string, answeredItemIds: string[] = []): Promise<{ resumeId: string; written: number }> {
  const record = await loadRecord(supabase)
  if (!record.items.length) throw new Error("We couldn't verify any facts. Add clearer notes or another source and try again.")
  const { data: existing, error: existingError } = await supabase.from("resumes").select("id,layout").eq("kind", "base").maybeSingle()
  if (existingError) throw new Error(existingError.message)
  const role = targetRole?.trim() || existing?.layout?.target_role || undefined
  const { headline, written: writtenNew } = await writeItems(supabase, userId, record, { targetRole: role })
  // Entries that already had bullets are rewritten only when the interview added something to them.
  let written = writtenNew
  const answered = answeredItemIds.filter((id) => record.bullets.some((b) => b.item_id === id))
  if (answered.length) written += (await writeItems(supabase, userId, await loadRecord(supabase), { itemIds: answered, targetRole: role })).written
  const fresh = await loadRecord(supabase)
  const base = defaultLayout(fresh, existing?.layout?.headline || headline)
  const itemOrder = existing?.layout?.item_order as string[] | undefined
  const layout: ResumeLayout = {
    ...base,
    items: applyItemOrder(base.items, itemOrder),
    ...(role ? { target_role: role } : {}),
    ...(itemOrder ? { item_order: itemOrder } : {}),
  }
  if (existing) {
    // Keep a section order the user chose; new sections are appended.
    const kept = (existing.layout?.section_order ?? []) as ItemType[]
    if (kept.length) layout.section_order = [...kept, ...layout.section_order.filter((t) => !kept.includes(t))]
    const { error } = await supabase.from("resumes").update({ layout, updated_at: new Date().toISOString() }).eq("id", existing.id)
    if (error) throw new Error(error.message)
    return { resumeId: existing.id as string, written }
  }
  const { data, error } = await supabase.from("resumes").insert({ kind: "base", title: "Base resume", layout }).select("id").single()
  if (error) throw new Error(error.message)
  return { resumeId: data.id as string, written }
}

// ⑥ Re-fit a resume from the current record, keeping its headline, target role and section order.
export async function relayoutResume(supabase: SupabaseClient, resumeId: string) {
  const [record, resume] = await Promise.all([loadRecord(supabase), loadResume(supabase, resumeId)])
  if (!resume) throw new Error("Resume not found")
  const include = resume.kind === "tailored" ? resume.layout.include : undefined
  const base = defaultLayout(record, resume.layout.headline, include)
  const kept = resume.layout.section_order ?? []
  const layout: ResumeLayout = {
    ...base,
    ...(resume.layout.target_role ? { target_role: resume.layout.target_role } : {}),
    ...(resume.layout.item_order ? { item_order: resume.layout.item_order } : {}),
    ...(include ? { include } : {}),
    items: applyItemOrder(base.items, resume.layout.item_order),
    section_order: kept.length ? [...kept, ...base.section_order.filter((t) => !kept.includes(t))] : base.section_order,
  }
  return fitAndSave(supabase, resumeId, layout, record)
}

// Whole flow in one call, for scripts and evals.
export async function buildBaseResume(supabase: SupabaseClient, userId: string, targetRole?: string): Promise<{ resumeId: string; report: BuildReport }> {
  const report = await buildRecord(supabase, userId)
  const { resumeId } = await writeBase(supabase, userId, targetRole)
  await refreshQuestions(supabase, userId).catch(() => {})
  await relayoutResume(supabase, resumeId)
  return { resumeId, report }
}

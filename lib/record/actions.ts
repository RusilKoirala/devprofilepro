"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { AiError } from "@/lib/ai/client"
import { BudgetError } from "@/lib/ai/budget"
import { ingestGitHub, GitHubError } from "@/lib/ingest/github"
import { ingestPullRequests } from "@/lib/ingest/github-pr"
import { ingestPaste } from "@/lib/ingest/paste"
import { ingestPdf } from "@/lib/ingest/pdf"
import type { IngestedSource } from "@/lib/ingest/types"
import { RateLimitedError } from "@/lib/ratelimit"
import { loadRecord, loadResume, saveSources } from "@/lib/record/db"
import { buildRecord, refreshQuestions, relayoutResume, writeBase, writeItems } from "@/lib/record/pipeline"
import { ItemDataSchema, ITEM_TYPES, type ItemType } from "@/lib/record/types"
import { runChecks, type CheckResult } from "@/lib/resume/checks"
import { loadResumeDoc } from "@/lib/resume/load"
import { pageCount, parserView, renderPdf } from "@/lib/resume/render"
import { createClient } from "@/lib/supabase/server"
import { isAppEnabled } from "@/lib/access"
import { questionFact } from "@/lib/record/question-fact"
import { REWRITE_STYLES, type RewriteStyle } from "@/lib/record/rewrite-styles"
import { reorderWithin } from "@/lib/resume/order"

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string }

async function session() {
  if (!isAppEnabled()) throw new Error("Not available")
  const { userId } = await auth()
  if (!userId) throw new Error("Not signed in")
  return { userId, supabase: await createClient() }
}

function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof RateLimitedError || err instanceof AiError || err instanceof GitHubError || err instanceof BudgetError) return { ok: false, error: err.message }
  console.error(err)
  return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" }
}

export interface CoverageLine {
  label: string
  ok: boolean
  detail: string
}

// ① Ingest everything the user gave us on /start.
export async function addSources(formData: FormData): Promise<ActionResult<CoverageLine[]>> {
  try {
    const { userId, supabase } = await session()
    const coverage: CoverageLine[] = []
    const sources: IngestedSource[] = []

    const github = String(formData.get("github") ?? "").trim()
    if (formData.get("useGithub") === "on" || github) {
      try {
        const gh = await ingestGitHub({ userId, username: github || undefined })
        sources.push(...gh)
        const deep = gh.filter((s) => s.meta?.repo_id).length
        const others = Number(gh.find((s) => s.label.startsWith("Other"))?.meta?.count ?? 0)
        coverage.push({ label: "GitHub", ok: true, detail: `${deep} repos read in full${others ? `, ${others} listed` : ""}` })
      } catch (err) {
        coverage.push({ label: "GitHub", ok: false, detail: err instanceof Error ? err.message : "Couldn't read GitHub" })
      }
    }

    const files = formData.getAll("pdfs").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 2)
    for (const file of files) {
      try {
        const src = await ingestPdf(userId, file)
        sources.push(src)
        const pages = Number(src.meta?.pages ?? 0)
        coverage.push({
          label: file.name,
          ok: src.status !== "failed",
          detail:
            src.status === "failed"
              ? "Couldn't read this PDF. Paste the text instead?"
              : src.meta?.transcribed
                ? "Read from an image, please check it"
                : `${pages} page${pages === 1 ? "" : "s"}${src.kind === "linkedin_pdf" ? " (LinkedIn export)" : ""}`,
        })
      } catch (err) {
        coverage.push({ label: file.name, ok: false, detail: err instanceof Error ? err.message : "Couldn't read this PDF" })
      }
    }

    const paste = String(formData.get("paste") ?? "")
    if (paste.trim()) {
      try {
        sources.push(ingestPaste(paste))
        coverage.push({ label: "Pasted notes", ok: true, detail: `${paste.trim().length.toLocaleString()} characters` })
      } catch (err) {
        coverage.push({ label: "Pasted notes", ok: false, detail: err instanceof Error ? err.message : "Couldn't use this" })
      }
    }

    const prUrls = String(formData.get("prs") ?? "").split(/\s+/).filter(Boolean)
    if (prUrls.length) {
      const { sources: prs, rejected } = await ingestPullRequests(userId, prUrls)
      sources.push(...prs)
      if (prs.length) coverage.push({ label: "Pull requests", ok: true, detail: `${prs.length} merged PRs added` })
      for (const r of rejected) coverage.push({ label: r.url, ok: false, detail: r.reason })
    }

    await saveSources(supabase, sources)
    revalidatePath("/start")
    return { ok: true, data: coverage }
  } catch (err) {
    return fail(err)
  }
}

// ②→⑥ Build the base resume in stages, so the client shows real progress instead of a timer.

// ② Extract + ③ quote check.
export async function stageExtract(): Promise<ActionResult<{ counts: Partial<Record<ItemType, number>>; factsKept: number; factsDropped: number; skipped: string[] }>> {
  try {
    const { userId, supabase } = await session()
    const report = await buildRecord(supabase, userId)
    return { ok: true, data: { counts: report.counts, factsKept: report.factsKept, factsDropped: report.factsDropped, skipped: report.skippedReadmes } }
  } catch (err) {
    return fail(err)
  }
}

// ⑤ Write bullets and save the base resume's layout.
export async function stageWrite(targetRole?: string): Promise<ActionResult<{ resumeId: string; written: number }>> {
  try {
    const { userId, supabase } = await session()
    const role = z.string().trim().max(120).optional().parse(targetRole)
    return { ok: true, data: await writeBase(supabase, userId, role) }
  } catch (err) {
    return fail(err)
  }
}

// ④ Questions. Best effort: a failure here never blocks the draft.
export async function stageQuestions(): Promise<ActionResult<{ open: number }>> {
  try {
    const { userId, supabase } = await session()
    await refreshQuestions(supabase, userId).catch((err) => console.error(err))
    const { count } = await supabase.from("questions").select("id", { count: "exact", head: true }).eq("status", "open")
    return { ok: true, data: { open: count ?? 0 } }
  } catch (err) {
    return fail(err)
  }
}

// ⑥ Fit to one page.
export async function stageFit(resumeId: string): Promise<ActionResult<{ pages: number; cuts: number; pinnedOverflow: boolean }>> {
  try {
    const { supabase } = await session()
    const fit = await relayoutResume(supabase, resumeId)
    revalidatePath("/", "layout")
    return { ok: true, data: { pages: fit.pages, cuts: fit.cuts.length, pinnedOverflow: fit.pinnedOverflow } }
  } catch (err) {
    return fail(err)
  }
}

// Recompute a resume's layout from the record (keeping its headline and section order) and re-fit.
async function relayout(resumeId: string) {
  const { supabase } = await session()
  await relayoutResume(supabase, resumeId)
  revalidatePath(`/resume/${resumeId}`)
}

export async function refit(resumeId: string): Promise<ActionResult> {
  try {
    await relayout(resumeId)
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

export async function editBullet(resumeId: string, bulletId: string, text: string): Promise<ActionResult> {
  try {
    const { supabase } = await session()
    const clean = text.trim()
    if (!clean) return { ok: false, error: "A bullet can't be empty. Remove it by hiding the item instead." }
    const [{ data: bullet, error: bulletError }, resume] = await Promise.all([
      supabase.from("bullets").select("item_id").eq("id", bulletId).single(),
      loadResume(supabase, resumeId),
    ])
    if (bulletError) throw new Error(bulletError.message)
    if (!resume?.layout.items.some((li) => li.item_id === bullet.item_id && li.bullet_ids.includes(bulletId))) throw new Error("Bullet not found in this resume")
    // Edited text is a new user assertion; old quotes no longer prove it.
    const { data: fact, error: factError } = await supabase.from("facts").insert({ item_id: bullet.item_id, text: clean, label: "user", approx: RANGE.test(clean) }).select("id").single()
    if (factError) throw new Error(factError.message)
    const { error } = await supabase.from("bullets").update({ text: clean, fact_ids: [fact.id], user_edited: true, updated_at: new Date().toISOString() }).eq("id", bulletId)
    if (error) throw new Error(error.message)
    await relayout(resumeId)
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

export async function setItemState(resumeId: string | null, itemId: string, patch: { pinned?: boolean; status?: "shown" | "hidden" }): Promise<ActionResult> {
  try {
    const { supabase } = await session()
    const safePatch = z.object({ pinned: z.boolean().optional(), status: z.enum(["shown", "hidden"]).optional() }).strict().parse(patch)
    const { error } = await supabase.from("items").update({ ...safePatch, updated_at: new Date().toISOString() }).eq("id", itemId)
    if (error) throw new Error(error.message)
    if (resumeId) await relayout(resumeId)
    revalidatePath("/record")
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

// Restoring something the fit step cut pins it, so the next fit doesn't cut it again.
export async function restoreCut(resumeId: string, itemId: string): Promise<ActionResult> {
  return setItemState(resumeId, itemId, { pinned: true, status: "shown" })
}

const RANGE = /\d\s*[-–]\s*\d|[<>~+]|\bk\b/i

export async function answerQuestion(resumeId: string | null, questionId: string, answer: string | null): Promise<ActionResult> {
  try {
    const { userId, supabase } = await session()
    const { data: q, error: questionError } = await supabase.from("questions").select("id,item_id,prompt,kind,status").eq("id", questionId).single()
    if (questionError) throw new Error(questionError.message)
    if (!q) return { ok: false, error: "Question not found" }
    if (q.status !== "open") return { ok: true, data: undefined }
    const factText = questionFact(q, answer)
    if (!factText) {
      const { error } = await supabase.from("questions").update({ status: answer?.trim() ? "answered" : "skipped", answer }).eq("id", questionId)
      if (error) throw new Error(error.message)
    } else {
      // The answer is saved as a fact the user told us; ranges stay ranges.
      const { error: factError } = await supabase.from("facts").insert({ item_id: q.item_id, text: factText, label: "user", approx: RANGE.test(factText) })
      if (factError) throw new Error(factError.message)
      const { error } = await supabase.from("questions").update({ status: "answered", answer }).eq("id", questionId)
      if (error) throw new Error(error.message)
      if (q.kind === "ownership" && answer?.trim().toLowerCase() !== "no") {
        const { data: item, error: itemError } = await supabase.from("items").select("data").eq("id", q.item_id).single()
        if (itemError) throw new Error(itemError.message)
        const { error: updateError } = await supabase.from("items").update({ data: { ...item.data, ownership_confirmed: true }, updated_at: new Date().toISOString() }).eq("id", q.item_id)
        if (updateError) throw new Error(updateError.message)
      }
      // Rewrite only the affected item.
      const record = await loadRecord(supabase)
      const resume = resumeId ? await loadResume(supabase, resumeId) : null
      await writeItems(supabase, userId, record, { itemIds: [q.item_id], targetRole: resume?.layout.target_role })
    }
    if (resumeId) await relayout(resumeId)
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}


export async function regenerateItem(resumeId: string, itemId: string, style: RewriteStyle = "default"): Promise<ActionResult> {
  try {
    const { userId, supabase } = await session()
    const instruction = REWRITE_STYLES[z.enum(Object.keys(REWRITE_STYLES) as [RewriteStyle]).parse(style)]
    const [record, resume] = await Promise.all([loadRecord(supabase), loadResume(supabase, resumeId)])
    await writeItems(supabase, userId, record, { itemIds: [itemId], releaseEdits: true, targetRole: resume?.layout.target_role, instruction })
    await relayout(resumeId)
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

// Links typed by hand: "github.com/x" or a bare GitHub username become full URLs.
function normalizeLink(value: string | null | undefined, kind?: "github" | "linkedin"): string | null {
  const v = value?.trim()
  if (!v) return null
  if (/^https?:\/\//i.test(v)) return v
  if (kind === "github" && /^@?[A-Za-z0-9-]+$/.test(v)) return `https://github.com/${v.replace(/^@/, "")}`
  if (kind === "linkedin" && /^[A-Za-z0-9-]+$/.test(v)) return `https://www.linkedin.com/in/${v}`
  return `https://${v}`
}

const text = (max = 200) => z.string().trim().max(max).nullable().optional()

const HeaderSchema = z.object({
  name: text(120),
  headline: text(120),
  target_role: text(120),
  email: text(),
  phone: text(60),
  location: text(120),
  website: text(),
  github: text(),
  linkedin: text(),
})

// Name, contact line, headline and target role. Typed by the user, so no source check.
export async function updateHeader(resumeId: string, input: z.input<typeof HeaderSchema>): Promise<ActionResult> {
  try {
    const { supabase } = await session()
    const h = HeaderSchema.parse(input)
    const contact = {
      name: h.name || null,
      email: h.email || null,
      phone: h.phone || null,
      location: h.location || null,
      website: normalizeLink(h.website),
      github: normalizeLink(h.github, "github"),
      linkedin: normalizeLink(h.linkedin, "linkedin"),
    }
    const [{ data: existing, error: contactError }, resume] = await Promise.all([
      supabase.from("items").select("id,data").eq("type", "contact").limit(1).maybeSingle(),
      loadResume(supabase, resumeId),
    ])
    if (contactError) throw new Error(contactError.message)
    if (!resume) throw new Error("Resume not found")
    if (existing) {
      const { error } = await supabase.from("items").update({ data: { ...existing.data, ...contact }, updated_at: new Date().toISOString() }).eq("id", existing.id)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await supabase.from("items").insert({ type: "contact", data: contact, rank: 100, status: "shown", reason: "Added by you" })
      if (error) throw new Error(error.message)
    }
    const layout = { ...resume.layout, headline: h.headline ?? "", target_role: h.target_role || undefined }
    const { error } = await supabase.from("resumes").update({ layout, updated_at: new Date().toISOString() }).eq("id", resumeId)
    if (error) throw new Error(error.message)
    await relayout(resumeId)
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

const DetailsSchema = z.object({
  role: text(), company: text(), name: text(), url: text(), school: text(), degree: text(), details: text(300),
  category: text(80), location: text(120), start: text(40), end: text(40),
  tech: z.array(z.string().trim().min(1).max(60)).max(20).nullable().optional(),
  skills: z.array(z.string().trim().min(1).max(60)).max(40).nullable().optional(),
})
const EDITABLE: Record<Exclude<ItemType, "contact">, (keyof z.infer<typeof DetailsSchema>)[]> = {
  job: ["role", "company", "location", "start", "end"],
  project: ["name", "url", "tech", "start", "end"],
  award: ["name", "url", "start", "end"],
  education: ["school", "degree", "details", "location", "start", "end"],
  skills: ["category", "skills"],
}

// Titles, companies, dates, links and skill lists, edited by hand.
export async function updateItemDetails(resumeId: string | null, itemId: string, input: z.input<typeof DetailsSchema>): Promise<ActionResult> {
  try {
    const { supabase } = await session()
    const patch = DetailsSchema.parse(input)
    const { data: item, error: itemError } = await supabase.from("items").select("type,data").eq("id", itemId).single()
    if (itemError) throw new Error(itemError.message)
    if (item.type === "contact") throw new Error("Edit contact details from the resume header.")
    const allowed = EDITABLE[item.type as Exclude<ItemType, "contact">]
    const data = { ...item.data }
    for (const key of allowed) {
      if (!(key in patch)) continue
      const value = patch[key]
      data[key] = key === "url" ? normalizeLink(value as string | null) : Array.isArray(value) ? (value.length ? value : null) : value || null
    }
    const { error } = await supabase.from("items").update({ data, updated_at: new Date().toISOString() }).eq("id", itemId)
    if (error) throw new Error(error.message)
    if (resumeId) await relayout(resumeId)
    revalidatePath("/record")
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

// A bullet typed by the user: saved as a "You told us" fact plus a bullet that cites it.
export async function addBullet(resumeId: string, itemId: string, input: string): Promise<ActionResult> {
  try {
    const { supabase } = await session()
    const clean = z.string().trim().min(3, "Write a little more.").max(400).parse(input)
    const { data: fact, error: factError } = await supabase.from("facts").insert({ item_id: itemId, text: clean, label: "user", approx: RANGE.test(clean) }).select("id").single()
    if (factError) throw new Error(factError.message)
    const { error } = await supabase.from("bullets").insert({ item_id: itemId, text: clean, fact_ids: [fact.id], user_edited: true })
    if (error) throw new Error(error.message)
    await relayout(resumeId)
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

const BulletSnapshot = z.object({ item_id: z.string().uuid(), text: z.string().min(1).max(600), fact_ids: z.array(z.string().uuid()).min(1), user_edited: z.boolean() })
export type DeletedBullet = z.infer<typeof BulletSnapshot>

// Facts stay in the Career Record; only the wording goes. Returns what's needed to undo.
export async function deleteBullet(resumeId: string, bulletId: string): Promise<ActionResult<DeletedBullet>> {
  try {
    const { supabase } = await session()
    const { data: bullet, error: bulletError } = await supabase.from("bullets").select("item_id,text,fact_ids,user_edited").eq("id", bulletId).single()
    if (bulletError) throw new Error(bulletError.message)
    const { error } = await supabase.from("bullets").delete().eq("id", bulletId)
    if (error) throw new Error(error.message)
    await relayout(resumeId)
    return { ok: true, data: bullet as DeletedBullet }
  } catch (err) {
    return fail(err)
  }
}

export async function restoreBullet(resumeId: string, snapshot: DeletedBullet): Promise<ActionResult> {
  try {
    const { supabase } = await session()
    // The database re-checks that every fact belongs to this user and item.
    const { error } = await supabase.from("bullets").insert(BulletSnapshot.parse(snapshot))
    if (error) throw new Error(error.message)
    await relayout(resumeId)
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

// Entry order inside one section, from drag-and-drop or Move up/down. Display order only:
// what gets cut to fit one page still follows strength.
export async function setItemOrder(resumeId: string, sectionIds: string[]): Promise<ActionResult> {
  try {
    const { supabase } = await session()
    const ids = z.array(z.string().uuid()).min(1).max(100).parse(sectionIds)
    const resume = await loadResume(supabase, resumeId)
    if (!resume) throw new Error("Resume not found")
    const current = resume.layout.items.map((li) => li.item_id)
    if (new Set(ids).size !== ids.length || ids.some((id) => !current.includes(id))) throw new Error("That entry isn't on this resume any more. Refresh and try again.")
    const known = resume.layout.item_order?.length ? [...resume.layout.item_order, ...current.filter((id) => !resume.layout.item_order!.includes(id))] : current
    const item_order = reorderWithin(known, ids)
    const { error } = await supabase.from("resumes").update({ layout: { ...resume.layout, item_order }, updated_at: new Date().toISOString() }).eq("id", resumeId)
    if (error) throw new Error(error.message)
    await relayout(resumeId)
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

// Section order from drag-and-drop or the arrows. Sections not on the page keep their place after these.
export async function setSectionOrder(resumeId: string, order: ItemType[]): Promise<ActionResult> {
  try {
    const { supabase } = await session()
    const types = z.array(z.enum(ITEM_TYPES).exclude(["contact"])).max(5).parse(order)
    if (new Set(types).size !== types.length) throw new Error("Each section can appear once.")
    const resume = await loadResume(supabase, resumeId)
    if (!resume) throw new Error("Resume not found")
    const section_order = [...types, ...resume.layout.section_order.filter((t) => !types.includes(t as (typeof types)[number]))]
    const { error } = await supabase.from("resumes").update({ layout: { ...resume.layout, section_order }, updated_at: new Date().toISOString() }).eq("id", resumeId)
    if (error) throw new Error(error.message)
    await relayout(resumeId)
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

const ManualItemSchema = z.object({
  type: z.enum(ITEM_TYPES).exclude(["contact", "skills"]),
  data: ItemDataSchema.partial(),
  facts: z.array(z.string().trim().min(3)).max(8),
})

// Manual entry: facts labelled "You told us", no AI.
export async function addManualItem(input: z.input<typeof ManualItemSchema>): Promise<ActionResult> {
  try {
    const { supabase } = await session()
    const parsed = ManualItemSchema.parse(input)
    const { data: item, error } = await supabase
      .from("items")
      .insert({ type: parsed.type, data: parsed.data, rank: 60, status: "shown", reason: "Added by you" })
      .select("id")
      .single()
    if (error) throw new Error(error.message)
    if (parsed.facts.length) {
      const { data: facts, error: factError } = await supabase.from("facts").insert(parsed.facts.map((text) => ({ item_id: item.id, text, label: "user", approx: RANGE.test(text) }))).select("id,text")
      if (factError) throw new Error(factError.message)
      if (parsed.type !== "education") {
        const { error: bulletError } = await supabase.rpc("replace_generated_bullets", { p_item_ids: [item.id], p_bullets: facts.map((f) => ({ item_id: item.id, text: f.text, fact_ids: [f.id] })) })
        if (bulletError) throw new Error(bulletError.message)
      }
    }
    const { data: base, error: baseError } = await supabase.from("resumes").select("id").eq("kind", "base").maybeSingle()
    if (baseError) throw new Error(baseError.message)
    if (base) await relayout(base.id)
    revalidatePath("/record")
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

export async function markSent(exportId: string, sent: boolean): Promise<ActionResult> {
  try {
    const { supabase } = await session()
    const { error } = await supabase.from("exports").update({ sent_at: sent ? new Date().toISOString() : null }).eq("id", exportId)
    if (error) throw new Error(error.message)
    revalidatePath("/home")
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

// ⑦ Checks + parser view, run on the actual rendered PDF.
export async function runResumeChecks(resumeId: string): Promise<ActionResult<{ results: CheckResult[]; ready: boolean; parserText: string }>> {
  try {
    const { supabase } = await session()
    const loaded = await loadResumeDoc(supabase, resumeId)
    if (!loaded) return { ok: false, error: "Resume not found" }
    const pdf = await renderPdf(loaded.doc)
    const [pages, parserText] = await Promise.all([pageCount(pdf), parserView(pdf)])
    const facts = new Map(loaded.record.facts.map((f) => [f.id, f]))
    const shownBullets = loaded.resume.layout.items.flatMap((li) => li.bullet_ids)
    const allBulletsSourced = loaded.record.bullets
      .filter((b) => shownBullets.includes(b.id))
      .every((b) => b.fact_ids.length > 0 && b.fact_ids.every((id) => facts.get(id)?.item_id === b.item_id))
    const { results, ready } = await runChecks(loaded.doc, { pages, allBulletsSourced })
    return { ok: true, data: { results, ready, parserText } }
  } catch (err) {
    return fail(err)
  }
}

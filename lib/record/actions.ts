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
import { buildBaseResume, defaultLayout, fitAndSave, writeItems } from "@/lib/record/pipeline"
import { ItemDataSchema, ITEM_TYPES } from "@/lib/record/types"
import { runChecks, type CheckResult } from "@/lib/resume/checks"
import { loadResumeDoc } from "@/lib/resume/load"
import { pageCount, parserView, renderPdf } from "@/lib/resume/render"
import { createClient } from "@/lib/supabase/server"
import { isAppEnabled } from "@/lib/access"
import { questionFact } from "@/lib/record/question-fact"

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

// ②→⑥ Build the base resume from all sources.
export async function buildResume(): Promise<ActionResult<{ resumeId: string; factsDropped: number; skipped: string[] }>> {
  try {
    const { userId, supabase } = await session()
    const { resumeId, report } = await buildBaseResume(supabase, userId)
    revalidatePath("/", "layout")
    return { ok: true, data: { resumeId, factsDropped: report.factsDropped, skipped: report.skippedReadmes } }
  } catch (err) {
    return fail(err)
  }
}

// Recompute a resume's layout from the record (keeping its headline and section order) and re-fit.
async function relayout(resumeId: string) {
  const { supabase } = await session()
  const [record, resume] = await Promise.all([loadRecord(supabase), loadResume(supabase, resumeId)])
  if (!resume) throw new Error("Resume not found")
  const layout = { ...defaultLayout(record, resume.layout.headline), section_order: resume.layout.section_order }
  await fitAndSave(supabase, resumeId, layout, record)
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
      await writeItems(supabase, userId, record, [q.item_id])
    }
    if (resumeId) await relayout(resumeId)
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

export async function regenerateItem(resumeId: string, itemId: string): Promise<ActionResult> {
  try {
    const { userId, supabase } = await session()
    const record = await loadRecord(supabase)
    await writeItems(supabase, userId, record, [itemId], undefined, true)
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

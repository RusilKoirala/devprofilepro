"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { AiError } from "@/lib/ai/client"
import { AllowanceError, recordUsage, requireAllowance } from "@/lib/allowance"
import { APPLICATION_STATUSES } from "@/lib/applications"
import type { Allowance } from "@/lib/plans"
import { BudgetError } from "@/lib/ai/budget"
import { ingestGitHub, GitHubError } from "@/lib/ingest/github"
import { ingestPullRequests } from "@/lib/ingest/github-pr"
import { ingestPaste } from "@/lib/ingest/paste"
import { ingestLinkedInZip } from "@/lib/ingest/linkedin-zip"
import { MAX_FILES } from "@/lib/ingest/limits"
import { ingestPdf } from "@/lib/ingest/pdf"
import type { IngestedSource } from "@/lib/ingest/types"
import { RateLimitedError } from "@/lib/ratelimit"
import { loadRecord, loadResume, saveSources } from "@/lib/record/db"
import { buildRecord, queueInterview, refreshQuestions, relayoutResume, writeBase, writeItems, type DetailChange, type InterviewCard } from "@/lib/record/pipeline"
import { ItemDataSchema, ITEM_TYPES, itemTitle, type ItemType, type ResumeLayout } from "@/lib/record/types"
import { draftTailorPlan, planTailoredResume, TailorSchema, type TailorPlan } from "@/lib/ai/tailor"
import { MATCH_REPORT_VERSION, reportForResume } from "@/lib/ai/tailor-check"
import { chatTurn, resumeForChat, type ChatMessage } from "@/lib/ai/chat"
import { checkActions, presentFields, type ChatAction, type ChatContext } from "@/lib/record/chat-actions"
import { SECTION_TITLES } from "@/lib/resume/schema"
import { runChecks, type CheckResult } from "@/lib/resume/checks"
import { loadResumeDoc } from "@/lib/resume/load"
import type { ResumeDoc } from "@/lib/resume/schema"
import { pageCount, parserView, renderPdf } from "@/lib/resume/render"
import { createClient } from "@/lib/supabase/server"
import { isAppEnabled } from "@/lib/access"
import { questionFact } from "@/lib/record/question-fact"
import { findDuplicateFacts } from "@/lib/record/dedupe"
import { sharedBullets } from "@/lib/resume/order"
import {
  addLine, clearReview, editLine, RANGE, removeLine, restoreLine, setItemOrderIn, setItemStateIn, setSectionOrderIn, setTemplateIn, updateDetailsIn, updateHeaderIn,
  type DeletedBullet, type DetailsInput, type HeaderInput,
} from "@/lib/record/edits"
import { REWRITE_STYLES, type RewriteStyle } from "@/lib/record/rewrite-styles"

// `upgrade` is set when a Free allowance ran out, so the client can offer Pro.
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string; upgrade?: Allowance }

async function session() {
  if (!isAppEnabled()) throw new Error("Not available")
  const { userId } = await auth()
  if (!userId) throw new Error("Not signed in")
  return { userId, supabase: await createClient() }
}

function fail(err: unknown): { ok: false; error: string; upgrade?: Allowance } {
  if (err instanceof AllowanceError) return { ok: false, error: err.message, upgrade: err.allowance }
  if (err instanceof RateLimitedError || err instanceof AiError || err instanceof GitHubError || err instanceof BudgetError) return { ok: false, error: err.message }
  // Validation details are for us; the person gets the one message that says what to change.
  if (err instanceof z.ZodError) return { ok: false, error: err.issues[0]?.message && !/^(Expected|Invalid|Required)/.test(err.issues[0].message) ? err.issues[0].message : "That didn't look right. Check it and try again." }
  console.error(err)
  return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" }
}

export interface CoverageLine {
  label: string
  ok: boolean
  detail: string
}

// ① Ingest everything the user gave us on /start.
// After the first build, reading sources again is a sync or rebuild: a Free allowance.
// Counted by the Career Record, not the base resume: deleting the base resume must not make the
// next rebuild free.
async function hasBuiltRecord(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { count, error } = await supabase.from("items").select("id", { count: "exact", head: true })
  if (error) throw new Error(error.message)
  return (count ?? 0) > 0
}

export async function addSources(formData: FormData): Promise<ActionResult<CoverageLine[]>> {
  try {
    const { userId, supabase } = await session()
    // Checked here too, before anything is fetched, so a Free user out of syncs isn't left half way.
    if (await hasBuiltRecord(supabase)) await requireAllowance(supabase, "updates")
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

    const files = formData.getAll("pdfs").filter((f): f is File => f instanceof File && f.size > 0).slice(0, MAX_FILES)
    for (const file of files) {
      if (/\.zip$/i.test(file.name) || file.type.includes("zip")) {
        try {
          const src = await ingestLinkedInZip(file)
          sources.push(src)
          coverage.push({ label: file.name, ok: true, detail: `LinkedIn data export: ${(src.meta?.sections as string[]).join(", ")}` })
        } catch (err) {
          coverage.push({ label: file.name, ok: false, detail: err instanceof Error ? err.message : "Couldn't read this ZIP" })
        }
        continue
      }
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
export async function stageExtract(): Promise<ActionResult<{ counts: Partial<Record<ItemType, number>>; factsKept: number; factsDropped: number; skipped: string[]; added: string[]; updated: string[]; updatedIds: string[]; changes: DetailChange[] }>> {
  try {
    const { userId, supabase } = await session()
    // The first build is free; every read after it counts as a sync or rebuild.
    const counted = await hasBuiltRecord(supabase)
    if (counted) await requireAllowance(supabase, "updates")
    const report = await buildRecord(supabase, userId)
    if (counted) await recordUsage(supabase, "updates")
    return { ok: true, data: { counts: report.counts, factsKept: report.factsKept, factsDropped: report.factsDropped, skipped: report.skippedReadmes, added: report.added, updated: report.updated, updatedIds: report.updatedIds, changes: report.changes } }
  } catch (err) {
    return fail(err)
  }
}

// ⑤ Write bullets and save the base resume's layout.
export async function stageWrite(targetRole?: string, answeredItemIds: string[] = []): Promise<ActionResult<{ resumeId: string; written: number }>> {
  try {
    const { userId, supabase } = await session()
    const role = z.string().trim().max(120).optional().parse(targetRole)
    const answered = z.array(z.string().uuid()).max(50).parse(answeredItemIds)
    return { ok: true, data: await writeBase(supabase, userId, role, answered) }
  } catch (err) {
    return fail(err)
  }
}

// ④ Interview before writing. Best effort: if it fails, the resume is written from the sources alone.
export async function stageInterview(): Promise<ActionResult<InterviewCard[]>> {
  try {
    const { userId, supabase } = await session()
    return { ok: true, data: await queueInterview(supabase, userId) }
  } catch (err) {
    if (err instanceof RateLimitedError || err instanceof BudgetError) return fail(err)
    console.error(err)
    return { ok: true, data: [] }
  }
}

const InterviewAnswers = z.array(z.object({ id: z.string().uuid(), answer: z.string().trim().max(1000).nullable() })).max(20)

// Saves every interview answer as a "You told us" fact in one go, without rewriting after each
// one; stageWrite then writes the resume once. Returns the entries that gained a fact.
export async function submitInterview(answers: { id: string; answer: string | null }[]): Promise<ActionResult<{ itemIds: string[] }>> {
  try {
    const { supabase } = await session()
    const itemIds = new Set<string>()
    for (const { id, answer } of InterviewAnswers.parse(answers)) {
      const itemId = await saveAnswer(supabase, id, answer)
      if (itemId) itemIds.add(itemId)
    }
    return { ok: true, data: { itemIds: [...itemIds] } }
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

// New resume from a request or job post, in stages like the first build: plan (AI) → save → fit → check.
export async function stageTailorPlan(brief: string): Promise<ActionResult<TailorPlan>> {
  try {
    const { userId, supabase } = await session()
    const text = z.string().trim().min(3, "Say a little more about what this resume is for.").max(20000).parse(brief)
    await requireAllowance(supabase, "tailored")
    const record = await loadRecord(supabase)
    if (!record.items.some((i) => i.type !== "contact")) throw new Error("Your Career Record is empty. Add a source first.")
    return { ok: true, data: await planTailoredResume(userId, text, record.items, record.facts, sharedBullets(record.bullets)) }
  } catch (err) {
    return fail(err)
  }
}

export async function stageTailorSave(brief: string, input: TailorPlan): Promise<ActionResult<{ resumeId: string; title: string }>> {
  try {
    const { supabase } = await session()
    const plan = TailorSchema.parse(input)
    await requireAllowance(supabase, "tailored")
    const [record, { data: base, error: baseError }] = await Promise.all([loadRecord(supabase), supabase.from("resumes").select("layout").eq("kind", "base").maybeSingle()])
    if (baseError) throw new Error(baseError.message)
    // The plan came back through the browser: keep only ids that are really in this user's record.
    const known = new Set(record.items.filter((i) => i.type !== "contact").map((i) => i.id))
    const include = plan.items.map((i) => i.item_id).filter((id) => known.has(id))
    if (!include.length) throw new Error("Nothing in your Career Record matched this. Try describing the role differently.")
    const types = new Map(record.items.map((i) => [i.id, i.type]))
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .insert({ company: plan.company, role: plan.role, description: z.string().max(20000).parse(brief), match_report: { version: MATCH_REPORT_VERSION, requirements: plan.requirements, summary: plan.summary, reasons: plan.items } })
      .select("id")
      .single()
    if (jobError) throw new Error(jobError.message)
    const layout: ResumeLayout = {
      headline: base?.layout?.headline ?? "",
      target_role: plan.role ?? plan.title,
      section_order: [...new Set([...plan.section_order, "skills", "job", "education", "project", "award"] as const)],
      ...(base?.layout?.template ? { template: base.layout.template } : {}),
      // Relevance order for projects, skills and awards; jobs and schools stay newest first.
      item_order: include.filter((id) => types.get(id) !== "job" && types.get(id) !== "education"),
      include,
      items: [],
    }
    const { data, error } = await supabase.from("resumes").insert({ kind: "tailored", job_id: job.id, title: plan.title.slice(0, 120) || "New resume", layout }).select("id").single()
    if (error) throw new Error(error.message)
    // Counted when saved, not when the AI call ran.
    await recordUsage(supabase, "tailored", data.id as string)
    return { ok: true, data: { resumeId: data.id as string, title: plan.title } }
  } catch (err) {
    return fail(err)
  }
}

// A fresh, checked match report for a tailored resume, e.g. one whose report was made before the
// evidence checks. Only the report changes: the resume keeps its entries and wording.
export async function recheckMatch(resumeId: string): Promise<ActionResult> {
  try {
    const { userId, supabase } = await session()
    const [resume, record] = await Promise.all([loadResume(supabase, z.string().uuid().parse(resumeId)), loadRecord(supabase)])
    if (!resume?.job_id) throw new Error("This resume has no job post to check against.")
    const { data: job, error: jobError } = await supabase.from("jobs").select("description").eq("id", resume.job_id).single()
    if (jobError) throw new Error(jobError.message)
    if (!job.description?.trim()) throw new Error("This resume's job post wasn't saved, so it can't be re-checked.")
    const usable = record.items.filter((i) => i.type !== "contact")
    const draft = await draftTailorPlan(userId, job.description, usable, record.facts, sharedBullets(record.bullets))
    const include = resume.layout.include ?? usable.filter((i) => i.status === "shown").map((i) => i.id)
    const { error } = await supabase.from("jobs").update({ match_report: reportForResume(draft, include, usable, record.facts) }).eq("id", resume.job_id)
    if (error) throw new Error(error.message)
    revalidatePath(`/resume/${resumeId}`)
    return { ok: true, data: undefined }
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

// Each action: one edit from lib/record/edits.ts, then re-fit the page.
async function edit<T>(resumeId: string | null, apply: (supabase: Awaited<ReturnType<typeof session>>["supabase"]) => Promise<T>): Promise<ActionResult<T extends void ? undefined : T>> {
  try {
    const { supabase } = await session()
    const data = (await apply(supabase)) as T extends void ? undefined : T
    if (resumeId) await relayout(resumeId)
    revalidatePath("/record")
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function editBullet(resumeId: string, bulletId: string, text: string): Promise<ActionResult> {
  return edit(resumeId, (supabase) => editLine(supabase, resumeId, bulletId, text))
}

export async function setItemState(resumeId: string | null, itemId: string, patch: { pinned?: boolean; status?: "shown" | "hidden" }): Promise<ActionResult> {
  return edit(resumeId, (supabase) => setItemStateIn(supabase, resumeId, itemId, patch))
}

// Restoring something the fit step cut pins it, so the next fit doesn't cut it again.
export async function restoreCut(resumeId: string, itemId: string): Promise<ActionResult> {
  return setItemState(resumeId, itemId, { pinned: true, status: "shown" })
}

// Records one answer. A useful answer becomes a "You told us" fact (ranges stay ranges), and
// confirms ownership of a team project. Returns the item that gained a fact, if any.
async function saveAnswer(supabase: Awaited<ReturnType<typeof createClient>>, questionId: string, answer: string | null): Promise<string | null> {
  const { data: q, error: questionError } = await supabase.from("questions").select("id,item_id,prompt,kind,status").eq("id", questionId).single()
  if (questionError) throw new Error(questionError.message)
  if (!q || q.status !== "open") return null
  const factText = questionFact(q, answer)
  if (!factText) {
    const { error } = await supabase.from("questions").update({ status: answer?.trim() ? "answered" : "skipped", answer }).eq("id", questionId)
    if (error) throw new Error(error.message)
    return null
  }
  const { error: factError } = await supabase.from("facts").insert({ item_id: q.item_id, text: factText, label: "user", approx: RANGE.test(factText) })
  if (factError) throw new Error(factError.message)
  const { error } = await supabase.from("questions").update({ status: "answered", answer }).eq("id", questionId)
  if (error) throw new Error(error.message)
  if ((q.kind === "ownership" || q.kind === "built") && answer?.trim().toLowerCase() !== "no") {
    const { data: item, error: itemError } = await supabase.from("items").select("data").eq("id", q.item_id).single()
    if (itemError) throw new Error(itemError.message)
    const { error: updateError } = await supabase.from("items").update({ data: { ...item.data, ownership_confirmed: true }, updated_at: new Date().toISOString() }).eq("id", q.item_id)
    if (updateError) throw new Error(updateError.message)
  }
  return q.item_id as string
}

export async function answerQuestion(resumeId: string | null, questionId: string, answer: string | null): Promise<ActionResult> {
  try {
    const { userId, supabase } = await session()
    const itemId = await saveAnswer(supabase, questionId, answer)
    if (itemId) {
      // Rewrite only the affected item.
      const record = await loadRecord(supabase)
      const resume = resumeId ? await loadResume(supabase, resumeId) : null
      await writeItems(supabase, userId, record, { itemIds: [itemId], targetRole: resume?.layout.target_role })
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
    await requireAllowance(supabase, "fixes")
    const [record, resume] = await Promise.all([loadRecord(supabase), loadResume(supabase, resumeId)])
    const { written } = await writeItems(supabase, userId, record, { itemIds: [itemId], releaseEdits: true, targetRole: resume?.layout.target_role, instruction, purpose: "fix", resume })
    if (written) await recordUsage(supabase, "fixes", resumeId)
    await relayout(resumeId)
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

export async function updateHeader(resumeId: string, input: HeaderInput): Promise<ActionResult> {
  return edit(resumeId, (supabase) => updateHeaderIn(supabase, resumeId, input))
}

export async function updateItemDetails(resumeId: string | null, itemId: string, input: DetailsInput): Promise<ActionResult> {
  return edit(resumeId, (supabase) => updateDetailsIn(supabase, itemId, input))
}

// The person checked a line that lost part of its source and it still holds.
export async function keepLine(resumeId: string, itemId: string, bulletId: string): Promise<ActionResult> {
  return edit(resumeId, (supabase) => clearReview(supabase, z.string().uuid().parse(itemId), z.string().uuid().parse(bulletId)))
}

export async function addBullet(resumeId: string, itemId: string, input: string): Promise<ActionResult> {
  return edit(resumeId, (supabase) => addLine(supabase, itemId, input, resumeId))
}

export async function deleteBullet(resumeId: string, bulletId: string): Promise<ActionResult<DeletedBullet>> {
  return edit(resumeId, (supabase) => removeLine(supabase, bulletId, resumeId))
}

export async function restoreBullet(resumeId: string, snapshot: DeletedBullet): Promise<ActionResult> {
  return edit(resumeId, (supabase) => restoreLine(supabase, resumeId, snapshot))
}

export async function setItemOrder(resumeId: string, sectionIds: string[]): Promise<ActionResult> {
  return edit(resumeId, (supabase) => setItemOrderIn(supabase, resumeId, sectionIds))
}

// A new design changes how much fits, so the page is re-fit from everything again.
export async function setTemplate(resumeId: string, template: string): Promise<ActionResult> {
  return edit(resumeId, (supabase) => setTemplateIn(supabase, resumeId, template))
}

export async function setSectionOrder(resumeId: string, order: ItemType[]): Promise<ActionResult> {
  return edit(resumeId, (supabase) => setSectionOrderIn(supabase, resumeId, order))
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

// Merge reworded copies of the same fact into one, keeping every line's citation pointing at a fact
// that still exists. Nothing on the page changes; the Career Record just stops repeating itself.
export async function mergeDuplicateFacts(): Promise<ActionResult<{ merged: number }>> {
  try {
    const { supabase } = await session()
    const record = await loadRecord(supabase)
    const citations = new Map<string, number>()
    for (const b of record.bullets) for (const id of b.fact_ids) citations.set(id, (citations.get(id) ?? 0) + 1)
    const merge = findDuplicateFacts(record.facts, citations)
    if (!merge.size) return { ok: true, data: { merged: 0 } }
    for (const b of record.bullets) {
      if (!b.fact_ids.some((id) => merge.has(id))) continue
      const fact_ids = [...new Set(b.fact_ids.map((id) => merge.get(id) ?? id))]
      const { error } = await supabase.from("bullets").update({ fact_ids }).eq("id", b.id)
      if (error) throw new Error(error.message)
    }
    const { error } = await supabase.from("facts").delete().in("id", [...merge.keys()])
    if (error) throw new Error(error.message)
    revalidatePath("/record")
    revalidatePath("/home")
    return { ok: true, data: { merged: merge.size } }
  } catch (err) {
    return fail(err)
  }
}

const ExportPatch = z.object({
  // null = not sent. Any status marks the file as sent (keeping the first sent date).
  status: z.enum(APPLICATION_STATUSES).nullable().optional(),
  sentTo: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(2000).optional(),
})

// Where a downloaded file went and how that application is going.
export async function updateExport(exportId: string, input: z.input<typeof ExportPatch>): Promise<ActionResult> {
  try {
    const { supabase } = await session()
    const p = ExportPatch.parse(input)
    const { data: row, error: rowError } = await supabase.from("exports").select("sent_at,status").eq("id", exportId).single()
    if (rowError) throw new Error(rowError.message)
    const sending = p.status !== undefined ? p.status : p.sentTo ? (row.status ?? "sent") : undefined
    const patch = {
      ...(sending === null ? { sent_at: null, status: null } : sending ? { sent_at: row.sent_at ?? new Date().toISOString(), status: sending } : {}),
      ...(p.sentTo !== undefined ? { sent_to: p.sentTo || null } : {}),
      ...(p.notes !== undefined ? { notes: p.notes || null } : {}),
    }
    const { error } = await supabase.from("exports").update(patch).eq("id", exportId)
    if (error) throw new Error(error.message)
    revalidatePath("/home")
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

// Chat about one resume: one AI call proposes typed edits, code checks each against the resume,
// applies the ones that pass in order, re-fits once, and reports every edit as applied or skipped.
export interface ChatEditResult {
  label: string
  ok: boolean
  reason?: string
}

// Only the most recent turns go to the model, so long chats stay cheap and never hit a hard limit.
const CHAT_TURNS = 12
const ChatHistory = z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(20000) })).min(1).max(200)
const HEADER_KEYS = ["name", "headline", "target_role", "email", "phone", "location", "website", "github", "linkedin"] as const
const DETAIL_KEYS = ["role", "company", "name", "url", "school", "degree", "details", "category", "location", "start", "end", "tech", "skills"] as const

export async function chatWithResume(resumeId: string, messages: ChatMessage[]): Promise<ActionResult<{ reply: string; edits: ChatEditResult[] }>> {
  try {
    const { userId, supabase } = await session()
    const recent = ChatHistory.parse(messages).slice(-CHAT_TURNS)
    // The model's conversation must open with the user.
    const history = recent.slice(Math.max(0, recent.findIndex((m) => m.role === "user")))
    if (history.at(-1)?.role !== "user") throw new Error("Nothing to answer.")
    await requireAllowance(supabase, "fixes")
    const loaded = await loadResumeDoc(supabase, resumeId)
    if (!loaded) return { ok: false, error: "Resume not found" }
    const { text, ctx: base } = resumeForChat(loaded.resume, loaded.record, loaded.doc)
    const ctx: ChatContext = { ...base, userMessages: history.filter((m) => m.role === "user").map((m) => m.content) }
    const out = await chatTurn(userId, text, history, ctx)

    const title = (id: string | null) => (id ? `“${ctx.entries.get(id)?.title ?? "entry"}”` : "")
    const lineEntry = (id: string | null) => (id ? title(ctx.lines.get(id)?.entryId ?? null) : "")
    const label = (a: ChatAction): string => {
      switch (a.type) {
        case "edit_line": return `Edited a line in ${lineEntry(a.line_id)}`
        case "add_line": return `Added a line to ${title(a.entry_id)}`
        case "remove_line": return `Removed a line from ${lineEntry(a.line_id)}`
        case "rewrite_entry": return `Rewrote ${title(a.entry_id)}${a.text ? ` (${a.text})` : ""}`
        case "hide_entry": return `Took ${title(a.entry_id)} off the page`
        case "show_entry": return `Put ${title(a.entry_id)} back on the page`
        case "pin_entry": return `Pinned ${title(a.entry_id)}`
        case "unpin_entry": return `Unpinned ${title(a.entry_id)}`
        case "move_entry": return `Moved ${title(a.entry_id)} to position ${(a.position ?? 0) + 1}`
        case "move_section": return `Moved ${SECTION_TITLES[a.section ?? "project"]} to position ${(a.position ?? 0) + 1}`
        case "update_details": return `Updated details of ${title(a.entry_id)}`
        case "update_header": return "Updated the header"
      }
    }

    const edits: ChatEditResult[] = []
    let changed = false
    let stale = false // hide/show changes which entries the layout holds; moves need it current
    for (const c of checkActions(out.actions, ctx)) {
      const a = c.action
      if (!c.ok) {
        edits.push({ label: label(a), ok: false, reason: c.reason })
        continue
      }
      try {
        switch (a.type) {
          case "edit_line": await editLine(supabase, resumeId, a.line_id!, a.text!); break
          case "add_line": await addLine(supabase, a.entry_id!, a.text!, resumeId); break
          case "remove_line": await removeLine(supabase, a.line_id!, resumeId); break
          case "rewrite_entry": {
            const [record, resume] = await Promise.all([loadRecord(supabase), loadResume(supabase, resumeId)])
            await writeItems(supabase, userId, record, { itemIds: [a.entry_id!], releaseEdits: true, targetRole: resume?.layout.target_role, instruction: a.text?.trim() || undefined, resume })
            break
          }
          case "hide_entry":
          case "show_entry":
            await setItemStateIn(supabase, resumeId, a.entry_id!, { status: a.type === "hide_entry" ? "hidden" : "shown" })
            stale = true
            break
          case "pin_entry":
          case "unpin_entry":
            await setItemStateIn(supabase, resumeId, a.entry_id!, { pinned: a.type === "pin_entry" })
            break
          case "move_entry":
          case "move_section": {
            if (stale) await relayoutResume(supabase, resumeId)
            stale = false
            const [record, resume] = await Promise.all([loadRecord(supabase), loadResume(supabase, resumeId)])
            if (!resume) throw new Error("Resume not found")
            const types = new Map(record.items.map((i) => [i.id, i.type]))
            const place = <T,>(list: T[], value: T, at: number) => {
              const rest = list.filter((x) => x !== value)
              rest.splice(Math.max(0, Math.min(at, rest.length)), 0, value)
              return rest
            }
            if (a.type === "move_entry") {
              const type = types.get(a.entry_id!)
              const ids = resume.layout.items.map((li) => li.item_id).filter((id) => types.get(id) === type)
              if (!ids.includes(a.entry_id!)) throw new Error("It isn't on the page any more.")
              await setItemOrderIn(supabase, resumeId, place(ids, a.entry_id!, a.position!))
            } else {
              const present = new Set(resume.layout.items.map((li) => types.get(li.item_id)))
              const order = resume.layout.section_order.filter((t) => present.has(t))
              await setSectionOrderIn(supabase, resumeId, place(order, a.section!, a.position!))
            }
            break
          }
          case "update_details": await updateDetailsIn(supabase, a.entry_id!, presentFields(a.fields, DETAIL_KEYS) as DetailsInput); break
          case "update_header": await updateHeaderIn(supabase, resumeId, presentFields(a.fields, HEADER_KEYS) as HeaderInput); break
        }
        changed = true
        edits.push({ label: label(a), ok: true })
      } catch (err) {
        edits.push({ label: label(a), ok: false, reason: err instanceof Error ? err.message : "Couldn't apply this" })
      }
    }
    // Saved so the conversation follows the person to another device. Best effort: a failed save
    // must not lose the edits that were just made.
    const at = Date.now()
    const { error: chatError } = await supabase.from("chat_messages").insert([
      { resume_id: resumeId, role: "user", content: history.at(-1)!.content, created_at: new Date(at).toISOString() },
      { resume_id: resumeId, role: "assistant", content: out.reply, edits, created_at: new Date(at + 1).toISOString() },
    ])
    if (chatError) console.error("chat_messages insert failed", chatError)
    // A chat message counts only when it changed the resume.
    if (changed) {
      await recordUsage(supabase, "fixes", resumeId)
      await relayout(resumeId)
    }
    return { ok: true, data: { reply: out.reply, edits } }
  } catch (err) {
    return fail(err)
  }
}

// The finished resume for a result card: its render shape plus how the checks went.
export async function resumeSummary(resumeId: string): Promise<ActionResult<{ doc: ResumeDoc; bulletFacts: Record<string, string[]>; fails: number; warns: number; ready: boolean }>> {
  const checks = await runResumeChecks(resumeId)
  if (!checks.ok) return checks
  try {
    const { supabase } = await session()
    const loaded = await loadResumeDoc(supabase, resumeId)
    if (!loaded) return { ok: false, error: "Resume not found" }
    const count = (status: string) => checks.data.results.filter((r) => r.status === status).length
    const shown = new Set(loaded.doc.sections.flatMap((sec) => sec.entries.flatMap((e) => e.bullets.map((b) => b.id))))
    const bulletFacts = Object.fromEntries(loaded.record.bullets.filter((b) => shown.has(b.id)).map((b) => [b.id, b.fact_ids]))
    return { ok: true, data: { doc: loaded.doc, bulletFacts, fails: count("fail"), warns: count("warn"), ready: checks.data.ready } }
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
    const onPage = new Set(loaded.resume.layout.items.map((li) => li.item_id))
    const titles = new Map(loaded.record.items.map((i) => [i.id, itemTitle(i)]))
    const ownershipItems = [...new Set(loaded.record.questions.filter((q) => q.status === "open" && (q.kind === "ownership" || q.kind === "built") && onPage.has(q.item_id)).map((q) => q.item_id))]
    const openOwnership = ownershipItems.map((itemId) => ({ itemId, title: titles.get(itemId) ?? "a project" }))
    const reviewLines = loaded.record.items.flatMap((i) => i.data.review_lines ?? [])
    const { results, ready } = await runChecks(loaded.doc, { pages, allBulletsSourced, openOwnership, reviewLines })
    return { ok: true, data: { results, ready, parserText } }
  } catch (err) {
    return fail(err)
  }
}

// Resume library: rename, duplicate, delete. Downloads stay on the Dashboard after a delete.
export async function renameResume(resumeId: string, title: string): Promise<ActionResult> {
  try {
    const { supabase } = await session()
    const clean = z.string().trim().min(1, "Give it a name.").max(120).parse(title)
    const { error } = await supabase.from("resumes").update({ title: clean, updated_at: new Date().toISOString() }).eq("id", resumeId).eq("kind", "tailored")
    if (error) throw new Error(error.message)
    revalidatePath("/", "layout")
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

// A copy is always a tailored resume (there is one base), with its own copy of any own wording.
export async function duplicateResume(resumeId: string): Promise<ActionResult<{ resumeId: string }>> {
  try {
    const { supabase } = await session()
    const [resume, record] = await Promise.all([loadResume(supabase, resumeId), loadRecord(supabase)])
    if (!resume) throw new Error("Resume not found")
    const layout: ResumeLayout =
      resume.kind === "tailored"
        ? resume.layout
        : { ...resume.layout, include: resume.layout.items.map((li) => li.item_id) }
    const { data: copy, error } = await supabase
      .from("resumes")
      .insert({ kind: "tailored", job_id: resume.job_id, title: `${resume.kind === "base" ? "Base resume" : resume.title} (copy)`.slice(0, 120), layout, cut_log: resume.cut_log })
      .select("id")
      .single()
    if (error) throw new Error(error.message)
    const own = record.bullets.filter((b) => b.resume_id === resume.id)
    if (own.length) {
      // New ids for the copy's own lines, so its layout and hidden list are remapped to them.
      const ids = new Map(own.map((b) => [b.id, crypto.randomUUID()]))
      const start = Date.now()
      const { error: bulletError } = await supabase.from("bullets").insert(
        own.map((b, n) => ({ id: ids.get(b.id), item_id: b.item_id, text: b.text, fact_ids: b.fact_ids, user_edited: b.user_edited, resume_id: copy.id, replaces: b.replaces ?? null, created_at: new Date(start + n).toISOString() }))
      )
      if (bulletError) throw new Error(bulletError.message)
      const remapped = { ...layout, items: layout.items.map((li) => ({ ...li, bullet_ids: li.bullet_ids.map((id) => ids.get(id) ?? id) })) }
      const { error: layoutError } = await supabase.from("resumes").update({ layout: remapped }).eq("id", copy.id)
      if (layoutError) throw new Error(layoutError.message)
    }
    revalidatePath("/", "layout")
    return { ok: true, data: { resumeId: copy.id as string } }
  } catch (err) {
    return fail(err)
  }
}

export async function deleteResume(resumeId: string): Promise<ActionResult> {
  try {
    const { supabase } = await session()
    const resume = await loadResume(supabase, resumeId)
    if (!resume) throw new Error("Resume not found")
    // Its own lines go with it (cascade); every PDF downloaded from it stays. The base resume has no
    // lines of its own, so deleting it leaves the Career Record whole; Get started builds a new one.
    const { error } = await supabase.from("resumes").delete().eq("id", resumeId)
    if (error) throw new Error(error.message)
    // The job post goes too, unless a copy of this resume still uses it.
    if (resume.job_id) {
      const { count } = await supabase.from("resumes").select("id", { count: "exact", head: true }).eq("job_id", resume.job_id)
      if (count === 0) {
        const { error: jobError } = await supabase.from("jobs").delete().eq("id", resume.job_id)
        if (jobError) console.error(jobError)
      }
    }
    revalidatePath("/", "layout")
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

// Archive hides a resume from the sidebar and the default list; nothing is deleted.
export async function archiveResume(resumeId: string, archived: boolean): Promise<ActionResult> {
  try {
    const { supabase } = await session()
    const { error } = await supabase.from("resumes").update({ archived_at: archived ? new Date().toISOString() : null }).eq("id", resumeId).eq("kind", "tailored")
    if (error) throw new Error(error.message)
    revalidatePath("/", "layout")
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

export async function clearChat(resumeId: string): Promise<ActionResult> {
  try {
    const { supabase } = await session()
    const { error } = await supabase.from("chat_messages").delete().eq("resume_id", z.string().uuid().parse(resumeId))
    if (error) throw new Error(error.message)
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

import { notFound } from "next/navigation"
import type { MatchView } from "@/components/app/match-report"
import { ResumeEditor, type EditorData } from "@/components/app/resume-editor"
import type { QuestionView } from "@/components/app/questions-panel"
import { pageEvidence } from "@/lib/record/evidence"
import { itemTitle } from "@/lib/record/types"
import { loadResumeDoc } from "@/lib/resume/load"
import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "Resume · DevProfile" }
// Answering a question or regenerating an item calls the AI, then re-fits the page.
export const maxDuration = 300

export default async function ResumePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const loaded = await loadResumeDoc(supabase, id)
  if (!loaded) notFound()
  const { resume, record, doc } = loaded
  const [{ data: job }, { data: chat }] = await Promise.all([
    resume.job_id ? supabase.from("jobs").select("description,match_report").eq("id", resume.job_id).maybeSingle() : Promise.resolve({ data: null }),
    // The latest 60 messages, oldest first.
    supabase.from("chat_messages").select("role,content,edits").eq("resume_id", resume.id).order("created_at", { ascending: false }).limit(60),
  ])
  const report = job?.match_report as Partial<MatchView> | null
  const match: MatchView | null = report
    ? {
        version: report.version,
        summary: report.summary ?? "",
        description: job?.description ?? undefined,
        reasons: (report.reasons ?? []).map((r) => ({ item_id: r.item_id, reason: r.reason })),
        requirements: (report.requirements ?? []).map((r) => ({ text: r.text, status: r.status, item_ids: r.item_ids ?? [], fact_ids: r.fact_ids ?? [] })),
      }
    : null

  const sources = new Map(record.sources.map((s) => [s.id, s]))
  const items = new Map(record.items.map((i) => [i.id, i]))
  const onPage = new Set(doc.sections.flatMap((s) => s.entries.map((e) => e.item_id)))
  const questionView = (q: (typeof record.questions)[number]): QuestionView => ({
    id: q.id,
    prompt: q.prompt,
    options: q.options,
    item: items.get(q.item_id) ? itemTitle(items.get(q.item_id)!) : "",
  })
  const open = record.questions.filter((q) => q.status === "open")

  const data: EditorData = {
    resumeId: resume.id,
    kind: resume.kind,
    archived: !!resume.archived_at,
    chat: (chat ?? []).reverse().map((m) => ({ role: m.role, content: m.content, edits: m.edits ?? undefined })),
    title: resume.kind === "base" ? "Base resume" : resume.title,
    match,
    page: pageEvidence(doc, Object.fromEntries(record.bullets.map((b) => [b.id, b.fact_ids]))),
    titles: Object.fromEntries(record.items.map((i) => [i.id, itemTitle(i)])),
    doc,
    version: resume.updated_at,
    header: { name: doc.name, headline: doc.headline, targetRole: resume.layout.target_role ?? "", ...doc.contact },
    sections: doc.sections.map((s) => ({
      type: s.type,
      title: s.title,
      entries: s.entries.map((e) => {
        const item = items.get(e.item_id)!
        return {
          itemId: e.item_id,
          title: itemTitle(item),
          // Extracted education often repeats the date inside its details ("Expected Graduation: 2027").
          subtitle: [e.subtitle, e.dates && !e.subtitle.toLowerCase().includes(e.dates.toLowerCase()) ? e.dates : ""].filter(Boolean).join(" · "),
          pinned: item.pinned,
          reason: item.reason,
          details: {
            role: item.data.role ?? "", company: item.data.company ?? "", name: item.data.name ?? "", url: item.data.url ?? "",
            school: item.data.school ?? "", degree: item.data.degree ?? "", details: item.data.details ?? "", category: item.data.category ?? "",
            location: item.data.location ?? "", start: item.data.start ?? "", end: item.data.end ?? "",
            tech: (item.data.tech ?? []).join(", "), skills: (item.data.skills ?? []).join(", "),
          },
          questions: open.filter((q) => q.item_id === e.item_id).map(questionView),
          bullets: e.bullets.map((b) => {
            const bullet = record.bullets.find((x) => x.id === b.id)!
            return {
              id: b.id,
              text: b.text,
              userEdited: bullet.user_edited,
              ownCopy: !!bullet.resume_id,
              facts: record.facts
                .filter((f) => bullet.fact_ids.includes(f.id))
                .map((f) => ({ id: f.id, text: f.text, label: f.label, quote: f.quote, source: f.source_id ? (sources.get(f.source_id)?.label ?? null) : null, url: f.source_id ? (sources.get(f.source_id)?.url ?? null) : null })),
            }
          }),
        }
      }),
    })),
    cuts: resume.cut_log.map((c) => ({
      itemId: c.item_id,
      bulletText: c.bullet_id ? (record.bullets.find((b) => b.id === c.bullet_id)?.text ?? null) : null,
      title: items.get(c.item_id) ? itemTitle(items.get(c.item_id)!) : "Removed item",
      reason: c.reason,
    })),
    // Questions about items that aren't on the page right now (cut or hidden).
    otherQuestions: open.filter((q) => !onPage.has(q.item_id)).map(questionView),
  }

  return <ResumeEditor data={data} />
}

import { notFound } from "next/navigation"
import { ResumeEditor, type EditorData } from "@/components/app/resume-editor"
import { itemTitle } from "@/lib/record/types"
import { loadResumeDoc } from "@/lib/resume/load"
import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "Resume · DevProfile" }
// Answering a question or regenerating an item calls Claude, then re-fits the page.
export const maxDuration = 300

export default async function ResumePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const loaded = await loadResumeDoc(await createClient(), id)
  if (!loaded) notFound()
  const { resume, record, doc } = loaded

  const sources = new Map(record.sources.map((s) => [s.id, s]))
  const items = new Map(record.items.map((i) => [i.id, i]))
  const data: EditorData = {
    resumeId: resume.id,
    title: resume.title,
    version: resume.updated_at,
    sections: doc.sections.map((s) => ({
      type: s.type,
      title: s.title,
      entries: s.entries.map((e) => {
        const item = items.get(e.item_id)!
        return {
          itemId: e.item_id,
          title: itemTitle(item),
          subtitle: [e.subtitle, e.dates].filter(Boolean).join(" · "),
          pinned: item.pinned,
          bullets: e.bullets.map((b) => {
            const bullet = record.bullets.find((x) => x.id === b.id)!
            return {
              id: b.id,
              text: b.text,
              userEdited: bullet.user_edited,
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
    questions: record.questions
      .filter((q) => q.status === "open")
      .map((q) => ({ id: q.id, prompt: q.prompt, options: q.options, item: items.get(q.item_id) ? itemTitle(items.get(q.item_id)!) : "" })),
  }

  return <ResumeEditor data={data} />
}

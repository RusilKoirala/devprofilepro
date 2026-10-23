import { RecordView, type RecordItemView } from "@/components/app/record-view"
import { loadRecord } from "@/lib/record/db"
import { itemTitle } from "@/lib/record/types"
import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "Career Record · DevProfile" }

export default async function RecordPage() {
  const supabase = await createClient()
  const [record, { data: base }] = await Promise.all([loadRecord(supabase), supabase.from("resumes").select("id").eq("kind", "base").maybeSingle()])
  const sources = new Map(record.sources.map((s) => [s.id, s]))

  const items: RecordItemView[] = record.items.map((i) => ({
    id: i.id,
    type: i.type,
    title: itemTitle(i),
    detail: [i.data.company, i.data.degree, i.data.start && `${i.data.start}${i.data.end ? ` – ${i.data.end}` : ""}`, i.data.tech?.join(", "), i.data.skills?.join(", ")].filter(Boolean).join(" · "),
    status: i.status,
    pinned: i.pinned,
    reason: i.reason,
    rank: i.rank,
    facts: record.facts
      .filter((f) => f.item_id === i.id)
      .map((f) => ({ id: f.id, text: f.text, label: f.label, quote: f.quote, source: f.source_id ? (sources.get(f.source_id)?.label ?? null) : null, url: f.source_id ? (sources.get(f.source_id)?.url ?? null) : null })),
  }))

  return (
    <div className="mx-auto max-w-4xl pt-4">
      <p className="text-sm text-muted-foreground">
        Everything we found, including hidden items. Resumes are views of this record: change a fact once, and every resume using it updates.
      </p>
      <RecordView items={items} baseResumeId={base?.id ?? null} sourceCount={record.sources.length} />
    </div>
  )
}

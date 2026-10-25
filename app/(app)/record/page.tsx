import { currentUser } from "@clerk/nextjs/server"
import { DataControls } from "@/components/app/data-controls"
import { EntryDuplicates, type DuplicateEntryView, type DuplicatePairView } from "@/components/app/entry-duplicates"
import { EDITABLE } from "@/lib/record/edits"
import { findDuplicateEntries } from "@/lib/record/entry-dupes"
import { MergeDuplicates, RecordSources, type SourcesView } from "@/components/app/record-sources"
import { RecordView, type RecordItemView } from "@/components/app/record-view"
import { loadRecord } from "@/lib/record/db"
import { findDuplicateFacts } from "@/lib/record/dedupe"
import { itemTitle, type Item } from "@/lib/record/types"
import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "Career Record · DevProfile" }
// "Update everything" re-reads every source with the AI from this page.
export const maxDuration = 300

function ago(date: string) {
  const mins = Math.round((Date.now() - new Date(date).getTime()) / 60000)
  if (mins < 60) return `${Math.max(1, mins)} min ago`
  if (mins < 60 * 24) return `${Math.round(mins / 60)} h ago`
  const days = Math.round(mins / (60 * 24))
  return days < 30 ? `${days} day${days === 1 ? "" : "s"} ago` : new Date(date).toLocaleDateString()
}

export default async function RecordPage() {
  const supabase = await createClient()
  const [user, record, { data: base }] = await Promise.all([currentUser(), loadRecord(supabase), supabase.from("resumes").select("id").eq("kind", "base").maybeSingle()])
  const sources = new Map(record.sources.map((s) => [s.id, s]))

  const profile = record.sources.filter((s) => s.kind === "github" && s.label.startsWith("GitHub profile: ")).sort((a, b) => b.fetched_at.localeCompare(a.fetched_at))[0]
  const linkedinPdf = record.sources.filter((s) => s.kind === "linkedin_pdf").sort((a, b) => b.fetched_at.localeCompare(a.fetched_at))[0]
  const view: SourcesView = {
    github: profile
      ? { login: profile.label.replace("GitHub profile: ", ""), repos: record.sources.filter((s) => s.kind === "github" && s.meta?.repo_id).length, synced: ago(profile.fetched_at) }
      : null,
    githubLogin: user?.externalAccounts.find((a) => a.provider.includes("github") && a.verification?.status === "verified")?.username ?? null,
    linkedin: {
      url: record.items.find((i) => i.type === "contact")?.data.linkedin ?? null,
      imported: linkedinPdf ? ago(linkedinPdf.fetched_at) : null,
      format: linkedinPdf ? (linkedinPdf.meta?.format === "zip" ? "zip" : "pdf") : null,
    },
    files: {
      pdfs: record.sources.filter((s) => s.kind === "resume_pdf").length,
      notes: record.sources.filter((s) => s.kind === "paste").length,
      prs: record.sources.filter((s) => s.kind === "pr_link").length,
    },
    baseResumeId: base?.id ?? null,
  }

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
      .map((f) => ({ id: f.id, text: f.text, label: f.label, quote: f.quote, source: f.source_id ? (sources.get(f.source_id)?.label ?? null) : null, url: f.source_id ? (sources.get(f.source_id)?.url ?? null) : null, unverified: Boolean(f.source_id && sources.get(f.source_id)?.meta?.unverified) })),
  }))

  // Entries that look like the same thing read twice, with where each one's facts came from.
  const entryView = (item: Item): DuplicateEntryView => {
    const own = record.facts.filter((f) => f.item_id === item.id)
    const read = [...new Set(own.map((f) => f.source_id).filter((id): id is string => !!id))]
      .map((id) => sources.get(id))
      .filter((src) => !!src)
      .map((src) => `${src.label}, read ${new Date(src.fetched_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`)
    const keys = item.type === "contact" ? [] : EDITABLE[item.type]
    const fields = Object.fromEntries(keys.map((k) => [k, Array.isArray(item.data[k]) ? (item.data[k] as string[]).join(", ") : String(item.data[k] ?? "")]).filter(([, v]) => v))
    return { id: item.id, title: itemTitle(item), fields, sources: [...read, ...(own.some((f) => f.label === "user") ? ["you"] : [])], facts: own.length }
  }
  const KIND: Record<string, string> = { job: "job", project: "project", education: "school", award: "award" }
  const byId = new Map(record.items.map((i) => [i.id, i]))
  const duplicates: DuplicatePairView[] = findDuplicateEntries(record.items).map((p) => ({
    why: p.why,
    kind: KIND[byId.get(p.a)!.type] ?? "entry",
    a: entryView(byId.get(p.a)!),
    b: entryView(byId.get(p.b)!),
  }))

  return (
    <div className="mx-auto max-w-4xl space-y-10 pt-4">
      <RecordSources view={view} />
      <div>
        <h2 className="font-medium">Everything we found</h2>
        <p className="text-sm text-muted-foreground">
          Including hidden items. Every resume is built from this record: titles, dates and facts are shared, and a tailored resume can reword its own lines.
        </p>
        <div className="mt-4 space-y-3">
          <EntryDuplicates pairs={duplicates} />
          <MergeDuplicates count={findDuplicateFacts(record.facts).size} />
        </div>
        <RecordView items={items} baseResumeId={base?.id ?? null} />
      </div>
      <DataControls
        sources={[...record.sources]
          .sort((a, b) => b.fetched_at.localeCompare(a.fetched_at))
          .map((s) => ({ id: s.id, label: s.label, kind: s.kind, read: ago(s.fetched_at), facts: record.facts.filter((f) => f.source_id === s.id).length }))}
      />
    </div>
  )
}

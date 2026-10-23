import Link from "next/link"
import { ChevronRight, CircleAlert, CircleCheck, FileText } from "lucide-react"
import { ExportsTable, type ExportView } from "@/components/app/exports-table"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "Dashboard · DevProfile" }

function ago(date: string) {
  const mins = Math.round((Date.now() - new Date(date).getTime()) / 60000)
  if (mins < 60) return `${Math.max(1, mins)} min ago`
  if (mins < 60 * 24) return `${Math.round(mins / 60)} h ago`
  return new Date(date).toLocaleDateString()
}

export default async function HomePage() {
  const supabase = await createClient()
  const [{ data: resumes }, { data: exports }, { count: openQuestions }, { count: sources }] = await Promise.all([
    supabase.from("resumes").select("id,kind,title,updated_at").order("kind").order("updated_at", { ascending: false }),
    supabase.from("exports").select("id,filename,sent_at,created_at,resumes(title)").order("created_at", { ascending: false }).limit(20),
    supabase.from("questions").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("sources").select("id", { count: "exact", head: true }),
  ])
  const base = resumes?.find((r) => r.kind === "base")

  const exportViews: ExportView[] = (exports ?? []).map((e) => ({
    id: e.id,
    filename: e.filename,
    resume: (e.resumes as unknown as { title: string } | null)?.title ?? "Deleted resume",
    createdAt: e.created_at,
    sentAt: e.sent_at,
  }))

  return (
    <div className="mx-auto max-w-4xl space-y-6 pt-4">
      {/* Status */}
      <section className="flex items-start gap-3 rounded-xl border border-border p-4">
        {base ? <CircleCheck className="mt-0.5 size-5 text-emerald-400" /> : <CircleAlert className="mt-0.5 size-5 text-muted-foreground" />}
        <div className="min-w-0 flex-1">
          <p className={base ? "font-medium text-emerald-400" : "font-medium"}>{base ? "Your resume is ready" : "No resume yet"}</p>
          <p className="text-sm text-muted-foreground">
            {base
              ? `${sources ?? 0} sources · ${openQuestions ?? 0} open question${openQuestions === 1 ? "" : "s"} · updated ${ago(base.updated_at)}`
              : sources
                ? `${sources} sources added. Build your resume from them.`
                : "Add your GitHub, an old resume or some notes. Any one is enough."}
          </p>
        </div>
        <Button asChild size="sm" variant={base ? "secondary" : "default"}>
          <Link href={base ? `/resume/${base.id}` : "/start"}>{base ? "Open" : sources ? "Build resume" : "Get started"}</Link>
        </Button>
      </section>

      {/* Resumes */}
      <Panel title="Resumes" description="Each resume is a view of your Career Record." footer={{ href: "/record", label: "Career Record" }}>
        {resumes?.length ? (
          resumes.map((r) => (
            <Link key={r.id} href={`/resume/${r.id}`} className="flex items-center gap-3 rounded-xl bg-background p-4 transition-colors hover:bg-background/60">
              <FileText className="size-4 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{r.title}</p>
                <p className="text-sm text-muted-foreground">{r.kind === "base" ? "Base" : "Tailored"} · updated {ago(r.updated_at)}</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          ))
        ) : (
          <p className="rounded-xl bg-background p-4 text-sm text-muted-foreground">Your resumes will show up here.</p>
        )}
      </Panel>

      {/* Downloads */}
      <Panel title="Downloads" description="Every PDF you download is kept exactly as it was, so you know what you sent where.">
        <div className="rounded-xl bg-background px-2">
          {exportViews.length ? <ExportsTable exports={exportViews} /> : <p className="p-2 py-4 text-sm text-muted-foreground">No downloads yet.</p>}
        </div>
      </Panel>
    </div>
  )
}

function Panel({ title, description, footer, children }: { title: string; description: string; footer?: { href: string; label: string }; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-2">
      <div className="px-3 pt-2 pb-3">
        <h2 className="font-medium">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-2">{children}</div>
      {footer && (
        <div className="flex justify-end px-3 py-2">
          <Link href={footer.href} className="inline-flex items-center gap-1 text-sm font-medium hover:underline">
            {footer.label} <ChevronRight className="size-4" />
          </Link>
        </div>
      )}
    </section>
  )
}

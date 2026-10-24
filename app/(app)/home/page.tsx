import { redirect } from "next/navigation"
import Link from "next/link"
import { currentUser } from "@clerk/nextjs/server"
import { ArrowRight, CircleCheck, Copy, Download, FileText, Github, Linkedin, Mail, Plus, RefreshCw, Sparkles } from "lucide-react"
import { ExportsTable, type ExportView } from "@/components/app/exports-table"
import { PlanCard } from "@/components/app/plan-card"
import { ResumeThumbnail } from "@/components/app/resume-thumbnail"
import { Button } from "@/components/ui/button"
import { allowanceStates } from "@/lib/plans"
import { loadRecord } from "@/lib/record/db"
import { findDuplicateFacts } from "@/lib/record/dedupe"
import type { ResumeLayout } from "@/lib/record/types"
import { buildResume } from "@/lib/resume/build"
import { createClient } from "@/lib/supabase/server"
import { loadPlanUsage } from "@/lib/usage"

export const metadata = { title: "Dashboard · DevProfile" }

const DAY = 24 * 60 * 60 * 1000

function ago(date: string) {
  const mins = Math.round((Date.now() - new Date(date).getTime()) / 60000)
  if (mins < 60) return `${Math.max(1, mins)} min ago`
  if (mins < 60 * 24) return `${Math.round(mins / 60)} h ago`
  const days = Math.round(mins / (60 * 24))
  return days < 30 ? `${days} day${days === 1 ? "" : "s"} ago` : new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function since(date: string) {
  return Date.now() - new Date(date).getTime()
}

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`
}

interface Attention {
  icon: React.ReactNode
  text: string
  href: string
  action: string
}

// One page that answers: where does my resume stand, what should I do next, and what's left on the plan.
export default async function HomePage({ searchParams }: { searchParams: Promise<{ upgraded?: string }> }) {
  const { upgraded } = await searchParams
  const supabase = await createClient()
  const [user, record, { data: resumes }, { data: exports }, usage] = await Promise.all([
    currentUser(),
    loadRecord(supabase),
    supabase.from("resumes").select("id,kind,title,layout,updated_at").order("kind").order("updated_at", { ascending: false }),
    supabase.from("exports").select("id,filename,sent_at,created_at,resumes(title)").order("created_at", { ascending: false }).limit(20),
    loadPlanUsage(supabase),
  ])
  // Nothing yet: the first screen is "Where are you starting?", not an empty dashboard.
  if (!resumes?.length && !record.sources.length && !record.items.length) redirect("/start")
  const base = resumes?.find((r) => r.kind === "base")
  const tailored = (resumes ?? []).filter((r) => r.kind === "tailored")
  const tailoredLeft = allowanceStates(usage).find((a) => a.key === "tailored")!

  const contact = record.items.find((i) => i.type === "contact")?.data ?? {}
  const firstName = user?.firstName || (contact.name ?? "").split(/\s+/)[0] || ""
  const entries = record.items.filter((i) => i.type !== "contact")
  const github = record.sources.filter((s) => s.kind === "github" && s.label.startsWith("GitHub profile: ")).sort((a, b) => b.fetched_at.localeCompare(a.fetched_at))[0]
  const linkedin = record.sources.some((s) => s.kind === "linkedin_pdf")
  const lastSource = [...record.sources].sort((a, b) => b.fetched_at.localeCompare(a.fetched_at))[0]
  const openQuestions = record.questions.filter((q) => q.status === "open").length
  const duplicates = findDuplicateFacts(record.facts).size
  const sent = (exports ?? []).filter((e) => e.sent_at).length
  const baseHref = base ? `/resume/${base.id}` : "/start"

  // Worst first; only things the person can act on from here.
  const candidates: (Attention | false | null | undefined | "" | 0)[] = [
    !base && { icon: <FileText />, text: "Your sources are in. Build your first resume from them.", href: "/start/new", action: "Start" },
    base && (!contact.name || !contact.email) && { icon: <Mail />, text: `Add your ${!contact.name ? "name" : "email"} so recruiters can reach you.`, href: baseHref, action: "Fix" },
    openQuestions > 0 && { icon: <Sparkles />, text: `${plural(openQuestions, "quick question")} would make your resume more specific.`, href: baseHref, action: "Answer" },
    duplicates > 0 && { icon: <Copy />, text: `${plural(duplicates, "repeated fact")} in your Career Record.`, href: "/record", action: "Merge" },
    base && !github && { icon: <Github />, text: "Connect GitHub so new projects show up with one click.", href: "/record", action: "Connect" },
    github && since(github.fetched_at) > 14 * DAY && { icon: <Github />, text: `GitHub was last synced ${ago(github.fetched_at)}.`, href: "/record", action: "Sync" },
    base && !linkedin && { icon: <Linkedin />, text: "Import your LinkedIn PDF to bring in roles and dates.", href: "/record", action: "Import" },
    base && tailoredLeft.state !== "ok" && {
      icon: <Sparkles />,
      text: tailoredLeft.state === "out" ? "You've used this month's free tailored resumes. Pro makes them unlimited." : `${plural(tailoredLeft.left!, "free tailored resume")} left this month.`,
      href: "/pricing",
      action: "See Pro",
    },
    base && !(exports ?? []).length && { icon: <Download />, text: "Download your first PDF. It's free, and we keep the exact file you sent.", href: baseHref, action: "Open" },
  ]
  const attention = candidates.filter((a): a is Attention => !!a).slice(0, 5)

  const exportViews: ExportView[] = (exports ?? []).map((e) => ({
    id: e.id,
    filename: e.filename,
    resume: (e.resumes as unknown as { title: string } | null)?.title ?? "Deleted resume",
    createdAt: e.created_at,
    sentAt: e.sent_at,
  }))


  return (
    <div className="mx-auto max-w-5xl space-y-8 pt-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-medium tracking-tight">{firstName ? `Welcome back, ${firstName}` : "Welcome back"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{base ? `Your base resume was updated ${ago(base.updated_at)}.` : "Let's build your first resume."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/record"><RefreshCw /> Update from sources</Link></Button>
          <Button asChild><Link href={base ? "/resume" : "/start"}><Plus /> New resume</Link></Button>
        </div>
      </div>

      {upgraded && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] px-5 py-4 text-sm">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-emerald-400" />
          <p>
            {usage.plan === "pro" ? (
              <><span className="font-medium">You&apos;re on Pro.</span> <span className="text-muted-foreground">Tailor a resume for every job you apply to.</span></>
            ) : (
              <><span className="font-medium">Payment received, thank you.</span> <span className="text-muted-foreground">Pro switches on within a minute. Refresh if it hasn&apos;t yet.</span></>
            )}
          </p>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Resumes" value={resumes?.length ?? 0} detail={base ? `1 base${tailored.length ? ` · ${tailored.length} tailored` : ""}` : "None yet"} href="/resume" />
        <Stat label="Career Record" value={entries.length} detail={`${plural(record.facts.length, "fact")}, each with its source`} href="/record" />
        <Stat label="Downloads" value={exportViews.length} detail={exportViews.length ? `${sent} marked as sent` : "Free, always"} href="#downloads" />
        <Stat label="Sources" value={record.sources.length} detail={lastSource ? `Last read ${ago(lastSource.fetched_at)}` : "None yet"} href="/record" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          {/* Next steps */}
          <section className="rounded-2xl border border-border bg-card">
            <h3 className="px-5 pt-4 pb-2 text-sm font-medium">Next steps</h3>
            {attention.length ? (
              <ul className="divide-y divide-border">
                {attention.map((a) => (
                  <li key={a.text}>
                    <Link href={a.href} className="group flex items-center gap-3 px-5 py-3 text-sm transition-colors hover:bg-muted/40">
                      <span className="text-muted-foreground [&_svg]:size-4">{a.icon}</span>
                      <span className="min-w-0 flex-1">{a.text}</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground">{a.action} <ArrowRight className="size-3.5" /></span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="flex items-center gap-2 px-5 pb-4 text-sm text-muted-foreground"><CircleCheck className="size-4 text-emerald-400" /> All set. Your resume is complete and up to date.</p>
            )}
          </section>

          {/* Resumes */}
          {resumes && resumes.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium">Resumes</h3>
                <Link href="/resume" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">All resumes <ArrowRight className="size-3.5" /></Link>
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,140px)] gap-4">
                {resumes.slice(0, 4).map((r) => (
                  <Link key={r.id} href={`/resume/${r.id}`} className="group">
                    <div className="overflow-hidden rounded-md border border-border transition group-hover:-translate-y-0.5 group-hover:ring-2 group-hover:ring-foreground/20">
                      <ResumeThumbnail doc={buildResume(r.layout as ResumeLayout, record)} width={140} />
                    </div>
                    <p className="mt-2 truncate text-sm font-medium">{r.kind === "base" ? "Base resume" : r.title}</p>
                    <p className="text-xs text-muted-foreground">{ago(r.updated_at)}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        <PlanCard usage={usage} />
      </div>

      {/* Downloads */}
      <section id="downloads" className="scroll-mt-20 rounded-2xl border border-border bg-card">
        <div className="px-5 pt-4 pb-2">
          <h3 className="text-sm font-medium">Downloads</h3>
          <p className="text-sm text-muted-foreground">Every PDF you download is kept exactly as it was, so you know what you sent where.</p>
        </div>
        <div className="px-3 pb-2">
          {exportViews.length ? <ExportsTable exports={exportViews} /> : <p className="px-2 py-4 text-sm text-muted-foreground">No downloads yet.</p>}
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value, detail, href }: { label: string; value: number; detail: string; href: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-foreground/15">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{detail}</p>
    </Link>
  )
}

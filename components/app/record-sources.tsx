"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { ArrowRight, CheckCircle2, Circle, ExternalLink, FileArchive, FileText, Github, Linkedin, RefreshCw, Sparkles, XCircle } from "lucide-react"
import { toast } from "sonner"
import { offerUpgrade } from "@/components/app/upgrade-prompt"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useConnectGitHub } from "@/hooks/use-connect-github"
import { SyncReview } from "@/components/app/sync-review"
import { uploadProblem } from "@/lib/ingest/limits"
import type { DetailChange } from "@/lib/record/pipeline"
import { addSources, mergeDuplicateFacts, stageExtract, stageFit, stageWrite, type ActionResult } from "@/lib/record/actions"

export interface SourcesView {
  github: { login: string; repos: number; synced: string } | null
  githubLogin: string | null // from a connected GitHub account (sign-in or Connect), when there is one
  linkedin: { url: string | null; imported: string | null; format: "pdf" | "zip" | null }
  files: { pdfs: number; notes: number; prs: number }
  baseResumeId: string | null
}

type StepState = "pending" | "running" | "done" | "failed"
interface Step {
  label: string
  state: StepState
  detail?: string
}
interface Outcome {
  added: string[]
  updated: string[]
  updatedIds: string[]
  changes: DetailChange[]
  resumeId: string | null
}

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`
}

// The sources behind the Career Record, and one button that brings everything up to date.
export function RecordSources({ view }: { view: SourcesView }) {
  const router = useRouter()
  const [steps, setSteps] = useState<Step[] | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [username, setUsername] = useState("")
  const [byUsername, setByUsername] = useState(false)
  const [linkedinOpen, setLinkedinOpen] = useState(false)
  const [pdf, setPdf] = useState<File | null>(null)
  const running = steps?.some((s) => s.state === "running") ?? false
  const login = view.github?.login ?? view.githubLogin
  const { connect: connectGitHub, connecting, ready, failureReason } = useConnectGitHub("/record")
  const params = useSearchParams()
  const autoImported = useRef(false)

  // Each stage is its own server call, so the list shows where the update really is.
  async function update(opts: { github?: string | null; pdf?: File | null }) {
    const file = opts.pdf && /\.zip$/i.test(opts.pdf.name) ? "LinkedIn data export" : "LinkedIn PDF"
    const fetchLabel = opts.github && opts.pdf ? `Fetching GitHub and reading your ${file}` : opts.github ? `Fetching GitHub (@${opts.github})` : opts.pdf ? `Reading your ${file}` : null
    const labels = [fetchLabel, "Finding what's new", "Writing lines for new entries", "Fitting your base resume on one page"].filter((l): l is string => !!l)
    setOutcome(null)
    setSteps(labels.map((label) => ({ label, state: "pending" })))
    let i = 0
    const set = (n: number, patch: Partial<Step>) => setSteps((all) => all && all.map((s, k) => (k === n ? { ...s, ...patch } : s)))
    async function step<T>(call: () => Promise<ActionResult<T>>, describe: (d: T) => string): Promise<T | null> {
      const n = i++
      set(n, { state: "running" })
      const res = await call().catch((): ActionResult<T> => ({ ok: false, error: "We couldn't reach the server. Check your connection and try again." }))
      if (!res.ok) {
        set(n, { state: "failed", detail: res.error })
        if (!offerUpgrade(res)) toast.error(res.error)
        return null
      }
      set(n, { state: "done", detail: describe(res.data) })
      return res.data
    }

    if (fetchLabel) {
      const form = new FormData()
      if (opts.github) form.set("github", opts.github)
      if (opts.pdf) form.set("pdfs", opts.pdf)
      const read = await step(() => addSources(form), (lines) => lines.map((l) => `${l.ok ? "" : "✗ "}${l.label}: ${l.detail}`).join(" · ") || "Nothing new to read")
      if (!read) return
      // Nothing new could be read: stop rather than re-run the build on old data and call it "up to date".
      if (read.length && !read.some((l) => l.ok)) {
        set(0, { state: "failed" })
        setSteps((all) => all && all.filter((s, k) => k === 0))
        return void toast.error("Nothing new could be read, so nothing was updated.")
      }
      router.refresh()
    }
    const found = await step(stageExtract, (d) =>
      d.added.length || d.updated.length
        ? [d.added.length && `${plural(d.added.length, "new entry", "new entries")}`, d.updated.length && `more facts for ${plural(d.updated.length, "entry", "entries")}`].filter(Boolean).join(" · ")
        : "Nothing new. Your record already has all of this."
    )
    if (!found) return
    const written = await step(() => stageWrite(), (d) => (d.written ? `Wrote ${plural(d.written, "line")}, each citing its source` : "No new lines needed. Lines you edited are never touched."))
    if (!written) return
    const fit = await step(() => stageFit(written.resumeId), (d) => (d.pinnedOverflow ? "Pinned items don't fit on one page" : d.cuts ? `One page. Moved ${plural(d.cuts, "weaker line")} off to fit` : "Fits on one page"))
    if (!fit) return
    setOutcome({ added: found.added, updated: found.updated, updatedIds: found.updatedIds, changes: found.changes, resumeId: written.resumeId })
    router.refresh()
  }

  // Back from GitHub: import straight away, once, then drop the flag from the URL.
  useEffect(() => {
    if (params.get("github") !== "connected" || autoImported.current || !ready) return
    autoImported.current = true
    router.replace("/record", { scroll: false })
    if (view.githubLogin) return void update({ github: view.githubLogin })
    toast.error(failureReason() ?? "GitHub wasn't connected. Try again?", { duration: 10000 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, view.githubLogin, ready])

  const githubStatus = view.github
    ? `@${view.github.login} · ${plural(view.github.repos, "repo")} · synced ${view.github.synced}${view.githubLogin ? "" : " · public data only"}`
    : view.githubLogin
      ? `Connected as @${view.githubLogin} · not imported yet`
      : "Not connected"

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-medium">Sources</h2>
          <p className="text-sm text-muted-foreground">Everything in your Career Record comes from these. Update them any time; only new information is added.</p>
        </div>
        <Button onClick={() => update({ github: login })} disabled={running}>
          {running ? <Spinner /> : <RefreshCw />} Update everything
        </Button>
      </div>

      <div className="divide-y divide-border rounded-2xl border border-border bg-card">
        <SourceRow icon={<Github />} title="GitHub" status={githubStatus}>
          {view.github || view.githubLogin ? (
            <div className="flex gap-2">
              {!view.githubLogin && (
                <Button size="sm" variant="ghost" disabled={running || connecting} onClick={connectGitHub}>{connecting && <Spinner />} Connect account</Button>
              )}
              <Button size="sm" variant="secondary" disabled={running} onClick={() => update({ github: login })}>
                <RefreshCw /> {view.github ? "Sync" : "Import"}
              </Button>
            </div>
          ) : byUsername ? (
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (username.trim()) update({ github: username.trim() }) }}>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="GitHub username" className="h-8 w-40" autoComplete="off" autoFocus />
              <Button size="sm" type="submit" disabled={running || !username.trim()}>Import</Button>
              <Button size="sm" type="button" variant="ghost" onClick={() => setByUsername(false)}>Cancel</Button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" disabled={running} onClick={() => setByUsername(true)}>Use a username</Button>
              <Button size="sm" disabled={running || connecting || !ready} onClick={connectGitHub}>
                {connecting ? <Spinner /> : <Github />} Connect GitHub
              </Button>
            </div>
          )}
        </SourceRow>

        <SourceRow
          icon={<Linkedin />}
          title="LinkedIn"
          status={view.linkedin.imported ? `${view.linkedin.format === "zip" ? "Data export" : "Profile PDF"} imported ${view.linkedin.imported}` : view.linkedin.url ? "Profile linked, not imported yet" : "Not added"}
        >
          <Button size="sm" variant="secondary" disabled={running} onClick={() => setLinkedinOpen(true)}>{view.linkedin.imported ? "Update" : "Import"}</Button>
        </SourceRow>

        <SourceRow
          icon={<FileText />}
          title="Files and notes"
          status={[view.files.pdfs && plural(view.files.pdfs, "PDF"), view.files.notes && plural(view.files.notes, "note"), view.files.prs && plural(view.files.prs, "pull request")].filter(Boolean).join(" · ") || "None yet"}
        >
          <Button size="sm" variant="ghost" asChild><Link href="/start/sources">Add more</Link></Button>
        </SourceRow>
      </div>

      {steps && (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
          <ol className="space-y-3">
            {steps.map((s) => (
              <li key={s.label} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 shrink-0">
                  {s.state === "done" ? <CheckCircle2 className="size-4 text-emerald-400" /> : s.state === "failed" ? <XCircle className="size-4 text-destructive" /> : s.state === "running" ? <Spinner className="size-4" /> : <Circle className="size-4 text-muted-foreground/40" />}
                </span>
                <div className="min-w-0">
                  <p className={s.state === "pending" ? "text-muted-foreground/60" : "font-medium"}>{s.label}</p>
                  {s.detail && <p className={s.state === "failed" ? "text-destructive" : "text-muted-foreground"}>{s.detail}</p>}
                </div>
              </li>
            ))}
          </ol>
          {outcome && (
            <div className="flex flex-wrap items-start justify-between gap-3 border-t border-border pt-4 text-sm">
              <div className="flex min-w-0 gap-2">
                <Sparkles className="mt-0.5 size-4 shrink-0" />
                {outcome.added.length || outcome.updated.length ? (
                  <div className="space-y-1">
                    {outcome.added.length > 0 && <p><span className="text-muted-foreground">Added:</span> {outcome.added.join(", ")}</p>}
                    {outcome.updated.length > 0 && <p><span className="text-muted-foreground">More facts for:</span> {outcome.updated.join(", ")}</p>}
                  </div>
                ) : (
                  <p>You&apos;re up to date. Nothing new found.</p>
                )}
              </div>
              {outcome.resumeId && (
                <Button asChild size="sm" variant="secondary">
                  <Link href={`/resume/${outcome.resumeId}`}>Open base resume <ArrowRight /></Link>
                </Button>
              )}
            </div>
          )}
          {outcome && <SyncReview updatedIds={outcome.updatedIds} changes={outcome.changes} />}
        </div>
      )}

      <Dialog open={linkedinOpen} onOpenChange={setLinkedinOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update from LinkedIn</DialogTitle>
            <DialogDescription>LinkedIn doesn&apos;t let apps read profiles, so bring one of its own exports. Either works:</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="space-y-2 rounded-xl border border-border p-3">
              <p className="flex items-center gap-2 font-medium"><FileText className="size-4 text-muted-foreground" /> Profile PDF</p>
              <p className="text-muted-foreground">Instant. On your profile: <b>More</b> → <b>Save to PDF</b>.</p>
              <Button size="sm" variant="secondary" asChild>
                <a href={view.linkedin.url || "https://www.linkedin.com/in/me/"} target="_blank" rel="noreferrer">Open profile <ExternalLink /></a>
              </Button>
            </div>
            <div className="space-y-2 rounded-xl border border-border p-3">
              <p className="flex items-center gap-2 font-medium"><FileArchive className="size-4 text-muted-foreground" /> Data export ZIP</p>
              <p className="text-muted-foreground">Most detail. Pick <b>the works</b> or the fast file; LinkedIn emails it in about 10 minutes.</p>
              <Button size="sm" variant="secondary" asChild>
                <a href="https://www.linkedin.com/mypreferences/d/download-my-data" target="_blank" rel="noreferrer">Request export <ExternalLink /></a>
              </Button>
            </div>
          </div>
          <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground">
            {pdf && /\.zip$/i.test(pdf.name) ? <FileArchive className="size-5" /> : <FileText className="size-5" />}
            <span>{pdf ? pdf.name : "Choose the PDF or ZIP, or drop it here"}</span>
            <span className="text-xs">From the ZIP we only read jobs, education, projects and skills. Messages and connections are never opened.</span>
            <input type="file" accept="application/pdf,.zip,application/zip" className="sr-only" onChange={(e) => {
                const f = e.target.files?.[0] ?? null
                const problem = f && uploadProblem(f)
                if (problem) {
                  e.target.value = ""
                  setPdf(null)
                  return void toast.error(problem)
                }
                setPdf(f)
              }} />
          </label>
          <DialogFooter>
            <Button
              disabled={!pdf || running}
              onClick={() => {
                setLinkedinOpen(false)
                update({ pdf, github: null }).finally(() => setPdf(null))
              }}
            >
              Import and update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

function SourceRow({ icon, title, status, children }: { icon: React.ReactNode; title: string; status: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 p-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground [&_svg]:size-4">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="truncate text-sm text-muted-foreground">{status}</p>
      </div>
      {children}
    </div>
  )
}

// Shown when the record holds reworded copies of the same fact (from earlier builds).
export function MergeDuplicates({ count }: { count: number }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  if (!count) return null
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm">
      <Sparkles className="size-4 shrink-0" />
      <p className="min-w-0 flex-1">
        <span className="font-medium">{plural(count, "repeated fact")}.</span>{" "}
        <span className="text-muted-foreground">The same thing, worded differently by earlier reads. Merging keeps one copy; your resume stays the same.</span>
      </p>
      <Button
        size="sm"
        variant="secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          const res = await mergeDuplicateFacts()
          setBusy(false)
          if (!res.ok) return void toast.error(res.error)
          toast.success(`Merged ${plural(res.data.merged, "repeated fact")}`)
          router.refresh()
        }}
      >
        {busy && <Spinner />} Merge them
      </Button>
    </div>
  )
}

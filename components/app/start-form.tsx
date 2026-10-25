"use client"

import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { CheckCircle2, Circle, FileText, Github, GitPullRequest, StickyNote, Target, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { offerUpgrade } from "@/components/app/upgrade-prompt"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { MAX_FILES, uploadProblem } from "@/lib/ingest/limits"
import { addSources, stageExtract, stageFit, stageQuestions, stageWrite, type ActionResult, type CoverageLine } from "@/lib/record/actions"
import type { ItemType } from "@/lib/record/types"

interface SourceSummary {
  id: string
  kind: string
  label: string
  status: string
}

type StageState = "pending" | "running" | "done" | "failed"
interface Stage {
  label: string
  state: StageState
  detail?: string
  lines?: CoverageLine[]
}

const STAGES = ["Reading your sources", "Finding jobs, projects and skills", "Writing bullets", "Fitting it on one page", "Looking for what would make it stronger"]

const NOUNS: [ItemType, string, string][] = [
  ["job", "job", "jobs"],
  ["project", "project", "projects"],
  ["education", "school", "schools"],
  ["award", "award", "awards"],
]

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}

function hasInput(form: FormData) {
  return (
    form.get("useGithub") === "on" ||
    ["github", "paste", "prs"].some((k) => String(form.get(k) ?? "").trim()) ||
    form.getAll("pdfs").some((f) => f instanceof File && f.size > 0)
  )
}

export function StartForm({ githubLogin, sources, hasRecord, targetRole }: { githubLogin: string | null; sources: SourceSummary[]; hasRecord: boolean; targetRole: string }) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [stages, setStages] = useState<Stage[] | null>(null)
  const running = stages?.some((s) => s.state === "running") ?? false
  const readable = sources.filter((s) => s.status !== "failed").length

  function set(i: number, patch: Partial<Stage>) {
    setStages((prev) => prev && prev.map((s, n) => (n === i ? { ...s, ...patch } : s)))
  }

  // Each stage is its own server call, so the list shows where the build really is.
  async function step<T>(i: number, call: () => Promise<ActionResult<T>>, describe: (data: T) => string | undefined): Promise<T | null> {
    set(i, { state: "running" })
    const res = await call().catch((): ActionResult<T> => ({ ok: false, error: "We couldn't reach the server. Check your connection and try again." }))
    if (!res.ok) {
      set(i, { state: "failed", detail: res.error })
      if (!offerUpgrade(res)) toast.error(res.error)
      return null
    }
    set(i, { state: "done", detail: describe(res.data) })
    return res.data
  }

  async function onBuild(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const role = String(form.get("targetRole") ?? "").trim()
    const files = form.getAll("pdfs").filter((f): f is File => f instanceof File && f.size > 0)
    if (files.length > MAX_FILES) return void toast.error(`Add up to ${MAX_FILES} files at a time.`)
    const problem = files.map(uploadProblem).find(Boolean)
    if (problem) return void toast.error(problem)
    const fresh = hasInput(form)
    if (!fresh && !readable && !hasRecord) return void toast.error("Add your GitHub, a PDF or some notes first.")
    setStages(STAGES.map((label) => ({ label, state: "pending" })))

    if (fresh) {
      set(0, { state: "running" })
      const res = await addSources(form).catch((): ActionResult<CoverageLine[]> => ({ ok: false, error: "We couldn't reach the server. Check your connection and try again." }))
      if (!res.ok) {
        set(0, { state: "failed", detail: res.error })
        if (!offerUpgrade(res)) toast.error(res.error)
        return
      }
      const anyOk = res.data.some((c) => c.ok)
      // Nothing new was accepted: stop here with the input still in the form, rather than rebuild
      // from older sources the person didn't ask to process again.
      if (!anyOk) {
        set(0, { state: "failed", lines: res.data, detail: res.data.length ? "Nothing was added. Fix what's above and try again." : "Nothing new to read" })
        return void toast.error(res.data.find((c) => !c.ok)?.detail ?? "We couldn't read any of these. Try pasting the text instead.")
      }
      const failed = res.data.filter((c) => !c.ok).length
      set(0, { state: "done", lines: res.data, detail: failed ? `Added what we could read. ${plural(failed, "item", "items")} above weren't added. Going ahead with the rest.` : undefined })
      formRef.current?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input[type=file], textarea").forEach((el) => (el.value = ""))
      router.refresh()
    } else {
      set(0, { state: "done", detail: `Using your ${plural(readable, "saved source", "saved sources")}` })
    }

    const found = await step(1, stageExtract, (d) => {
      const parts = NOUNS.map(([type, one, many]) => (d.counts[type] ? plural(d.counts[type]!, one, many) : null)).filter(Boolean)
      const checked = d.factsKept ? ` · ${plural(d.factsKept, "fact", "facts")} matched word for word in your files` : ""
      const dropped = d.factsDropped ? ` · ${d.factsDropped} left out (not in your files)` : ""
      return `${parts.length ? `Found ${parts.join(", ")}` : "Nothing new found"}${checked}${dropped}`
    })
    if (!found) return

    const written = await step(2, () => stageWrite(role || undefined), (d) => (d.written ? `Wrote ${plural(d.written, "bullet", "bullets")}, each citing its source` : "Kept your existing bullets"))
    if (!written) return

    const fit = await step(3, () => stageFit(written.resumeId), (d) =>
      d.pinnedOverflow ? "Your pinned items don't fit on one page. Unpin something in the editor." : d.cuts ? `One page. Moved ${plural(d.cuts, "weaker line", "weaker lines")} off the page (you can restore them)` : "Fits on one page"
    )
    if (!fit) return

    await step(4, stageQuestions, (d) => (d.open ? `${plural(d.open, "quick question", "quick questions")} can make it stronger` : "Nothing missing"))
    router.push(`/resume/${written.resumeId}`)
  }

  return (
    <form ref={formRef} onSubmit={onBuild} className="mt-8 space-y-6">
      <fieldset disabled={running} className="space-y-2 rounded-3xl bg-card p-2">
        <SourceRow icon={<Github />} title="GitHub" hint="Public repos, read-only. We read READMEs, languages and dependencies.">
          {githubLogin ? (
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="useGithub" className="font-normal">Use @{githubLogin}</Label>
              <Switch id="useGithub" name="useGithub" defaultChecked={!sources.some((s) => s.kind === "github")} />
            </div>
          ) : (
            <Input name="github" aria-label="GitHub username or profile URL" placeholder="GitHub username or profile URL" autoComplete="off" />
          )}
        </SourceRow>
        <SourceRow icon={<FileText />} title="Resume or LinkedIn" hint="Up to 2 files: a resume PDF, LinkedIn's Save to PDF, or its data export ZIP (Settings → Data privacy → Get a copy of your data).">
          <Input name="pdfs" aria-label="Resume or LinkedIn files" type="file" accept="application/pdf,.zip,application/zip" multiple />
        </SourceRow>
        <SourceRow icon={<StickyNote />} title="Paste anything" hint="Portfolio text, project notes, courses, a job you did that isn't online.">
          <Textarea name="paste" aria-label="Pasted notes" rows={3} maxLength={20000} placeholder="Paste text here" />
        </SourceRow>
        <SourceRow icon={<GitPullRequest />} title="Open-source pull requests" hint="Merged PRs you opened in other people's repos, one per line.">
          <Textarea name="prs" aria-label="Pull request links, one per line" rows={2} placeholder="https://github.com/owner/repo/pull/123" />
        </SourceRow>
        <SourceRow icon={<Target />} title="What are you applying for? (optional)" hint="We lead with what matters for it. We never add skills you don't have.">
          <Input name="targetRole" aria-label="What are you applying for?" defaultValue={targetRole} maxLength={120} placeholder="e.g. Backend engineering internship" autoComplete="off" />
        </SourceRow>
      </fieldset>

      {sources.length > 0 && !stages && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Already added:</span>
          {sources.map((s) => (
            <Badge key={s.id} variant={s.status === "failed" ? "destructive" : "secondary"}>{s.label}</Badge>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-4 border-t border-border pt-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg" type="submit" disabled={running}>
            {running && <Spinner />} {hasRecord ? "Update my resume" : "Build my resume"}
          </Button>
          <span className="text-sm text-muted-foreground">{running ? "About a minute. Keep this tab open." : "Any one source is enough. You can add more later."}</span>
        </div>

        {stages && (
          <ol aria-live="polite" aria-label="Build progress" className="space-y-3 rounded-3xl bg-card p-4">
            {stages.map((s) => (
              <li key={s.label} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 shrink-0">
                  {s.state === "done" ? <CheckCircle2 className="size-4 text-emerald-400" /> : s.state === "failed" ? <XCircle className="size-4 text-destructive" /> : s.state === "running" ? <Spinner className="size-4" /> : <Circle className="size-4 text-muted-foreground/40" />}
                </span>
                <div className="min-w-0">
                  <p className={s.state === "pending" ? "text-muted-foreground/60" : "font-medium"}>{s.label}</p>
                  {s.detail && <p className={s.state === "failed" ? "text-destructive" : "text-muted-foreground"}>{s.detail}</p>}
                  {s.lines?.map((c, i) => (
                    <p key={i} className="text-muted-foreground">
                      <span className={c.ok ? "text-foreground/80" : "text-destructive"}>{c.ok ? "✓" : "✗"} {c.label}:</span> {c.detail}
                    </p>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </form>
  )
}

function SourceRow({ icon, title, hint, children }: { icon: React.ReactNode; title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-xl bg-background p-4">
      <div className="flex items-start gap-3 [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:text-muted-foreground">
        {icon}
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{hint}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

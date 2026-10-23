"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { CheckCircle2, FileText, Github, GitPullRequest, StickyNote, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { addSources, buildResume, type CoverageLine } from "@/lib/record/actions"

interface SourceSummary {
  id: string
  kind: string
  label: string
  status: string
}

const BUILD_STEPS = [
  "Reading your sources",
  "Finding jobs, projects and skills",
  "Checking every quote against your files",
  "Writing bullets",
  "Fitting it on one page",
]

export function StartForm({ githubLogin, sources, hasRecord }: { githubLogin: string | null; sources: SourceSummary[]; hasRecord: boolean }) {
  const router = useRouter()
  const [coverage, setCoverage] = useState<CoverageLine[] | null>(null)
  const [adding, startAdding] = useTransition()
  const [building, startBuilding] = useTransition()
  const [step, setStep] = useState(0)
  const canBuild = hasRecord || sources.some((source) => source.status !== "failed")

  function onAdd(formData: FormData) {
    startAdding(async () => {
      const res = await addSources(formData)
      if (!res.ok) return void toast.error(res.error)
      setCoverage(res.data)
      router.refresh()
    })
  }

  function onBuild() {
    setStep(0)
    // The build is one server call; advance the list on a timer so people see where it's at.
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, BUILD_STEPS.length - 1)), 9000)
    startBuilding(async () => {
      const res = await buildResume()
      clearInterval(timer)
      if (!res.ok) return void toast.error(res.error)
      if (res.data.factsDropped) toast.message(`${res.data.factsDropped} facts were left out because we couldn't find them in your files.`)
      router.push(`/resume/${res.data.resumeId}`)
    })
  }

  return (
    <div className="mt-8 space-y-6">
      <form action={onAdd} className="space-y-4">
        <section className="space-y-2 rounded-2xl border border-border bg-card p-2">
          <SourceRow icon={<Github />} title="GitHub" hint="Public repos, read-only. We read READMEs, languages and dependencies.">
            {githubLogin ? (
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="useGithub" className="font-normal">Use @{githubLogin}</Label>
                <Switch id="useGithub" name="useGithub" defaultChecked />
              </div>
            ) : (
              <Input name="github" placeholder="GitHub username or profile URL" autoComplete="off" />
            )}
          </SourceRow>
          <SourceRow icon={<FileText />} title="Resume or LinkedIn PDF" hint="Up to 2 PDFs, 5 MB each. LinkedIn: More → Save to PDF.">
            <Input name="pdfs" type="file" accept="application/pdf" multiple />
          </SourceRow>
          <SourceRow icon={<StickyNote />} title="Paste anything" hint="Portfolio text, project notes, courses.">
            <Textarea name="paste" rows={3} maxLength={20000} placeholder="Paste text here" />
          </SourceRow>
          <SourceRow icon={<GitPullRequest />} title="Open-source pull requests" hint="Merged PRs you opened in other people's repos, one per line.">
            <Textarea name="prs" rows={2} placeholder="https://github.com/owner/repo/pull/123" />
          </SourceRow>
        </section>

        <Button type="submit" variant="secondary" disabled={adding || building}>
          {adding && <Spinner />} Add sources
        </Button>
      </form>

      {coverage && (
        <Card>
          <CardHeader><CardTitle className="text-base">What we read</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {coverage.length === 0 && <p className="text-muted-foreground">Nothing was added.</p>}
            {coverage.map((c, i) => (
              <div key={i} className="flex items-start gap-2">
                {c.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />}
                <span><span className="font-medium">{c.label}:</span> <span className="text-muted-foreground">{c.detail}</span></span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {sources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your sources ({sources.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {sources.map((s) => (
              <Badge key={s.id} variant={s.status === "failed" ? "destructive" : "secondary"}>{s.label}</Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3 border-t border-border pt-6">
        <Button size="lg" onClick={onBuild} disabled={!canBuild || building || adding} className="self-start">
          {building && <Spinner />} Build my resume
        </Button>
        {building && (
          <ol className="space-y-1.5 text-sm">
            {BUILD_STEPS.map((label, i) => (
              <li key={label} className={i < step ? "text-muted-foreground line-through" : i === step ? "text-foreground" : "text-muted-foreground/60"}>
                {label}
              </li>
            ))}
          </ol>
        )}
        {!canBuild && <p className="text-sm text-muted-foreground">Add a readable source or a manual Career Record entry first.</p>}
      </div>
    </div>
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

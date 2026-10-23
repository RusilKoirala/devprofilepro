"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, CheckCircle2, CircleDashed, XCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import { runResumeChecks } from "@/lib/record/actions"
import type { CheckResult, CheckStatus } from "@/lib/resume/checks"

const ICONS: Record<CheckStatus, React.ReactNode> = {
  pass: <CheckCircle2 className="size-4 text-emerald-400" />,
  warn: <AlertTriangle className="size-4 text-amber-400" />,
  fail: <XCircle className="size-4 text-destructive" />,
  not_checked: <CircleDashed className="size-4 text-muted-foreground" />,
}

export function ChecksPanel({ resumeId, version }: { resumeId: string; version: string }) {
  const [state, setState] = useState<{ version: string; results: CheckResult[]; ready: boolean; parserText: string; error?: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    runResumeChecks(resumeId).then((res) => {
      if (cancelled) return
      setState(res.ok ? { version, ...res.data } : { version, results: [], ready: false, parserText: "", error: res.error })
    })
    return () => { cancelled = true }
  }, [resumeId, version])

  if (!state || state.version !== version) {
    return <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Spinner /> Checking your PDF and testing links…</div>
  }
  if (state.error) return <p className="py-8 text-sm text-destructive">{state.error}</p>

  return (
    <div className="space-y-4">
      <Alert>
        <AlertTitle>{state.ready ? "Reviewed and ready to export" : "Some checks failed"}</AlertTitle>
        <AlertDescription>Checks are advice. You can always download.</AlertDescription>
      </Alert>
      <ul className="space-y-2">
        {state.results.map((r) => (
          <li key={r.id} className="flex items-start gap-2 text-sm">
            <span className="mt-0.5">{ICONS[r.status]}</span>
            <span>
              {r.label}
              {r.status === "not_checked" && <span className="text-muted-foreground"> (not checked)</span>}
              {r.detail && <span className="block text-muted-foreground">{r.detail}</span>}
            </span>
          </li>
        ))}
      </ul>
      <div>
        <h3 className="text-sm font-medium">Parser view</h3>
        <p className="mb-2 text-xs text-muted-foreground">This is the text an applicant-tracking system reads from your actual PDF.</p>
        <pre className="max-h-96 overflow-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs whitespace-pre-wrap">{state.parserText}</pre>
      </div>
    </div>
  )
}

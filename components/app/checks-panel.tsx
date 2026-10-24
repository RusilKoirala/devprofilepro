"use client"

import { useEffect, useState } from "react"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CheckCircle2, CircleDashed, XCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import { runResumeChecks } from "@/lib/record/actions"
import type { CheckResult, CheckStatus } from "@/lib/resume/checks"

export type CheckTarget = NonNullable<CheckResult["targets"]>[number]

const ICONS: Record<CheckStatus, React.ReactNode> = {
  pass: <CheckCircle2 className="size-4 text-emerald-400" />,
  warn: <AlertTriangle className="size-4 text-amber-400" />,
  fail: <XCircle className="size-4 text-destructive" />,
  not_checked: <CircleDashed className="size-4 text-muted-foreground" />,
}

export interface ChecksState {
  version: string
  results: CheckResult[]
  ready: boolean
  parserText: string
  error?: string
}

// Checks run on the actual rendered PDF and re-run whenever the resume changes.
// Returns null while the current version is still being checked.
export function useResumeChecks(resumeId: string, version: string): ChecksState | null {
  const [state, setState] = useState<ChecksState | null>(null)
  useEffect(() => {
    let cancelled = false
    runResumeChecks(resumeId).then((res) => {
      if (cancelled) return
      setState(res.ok ? { version, ...res.data } : { version, results: [], ready: false, parserText: "", error: res.error })
    })
    return () => { cancelled = true }
  }, [resumeId, version])
  return state && state.version === version ? state : null
}

export function ReadinessBadge({ state, onClick }: { state: ChecksState | null; onClick: () => void }) {
  const fails = state?.results.filter((r) => r.status === "fail").length ?? 0
  const warns = state?.results.filter((r) => r.status === "warn").length ?? 0
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs transition-colors hover:bg-muted">
      {!state ? (
        <><Spinner className="size-3" /> Checking…</>
      ) : state.error ? (
        <><CircleDashed className="size-3.5 text-muted-foreground" /> Checks unavailable</>
      ) : fails ? (
        <><XCircle className="size-3.5 text-destructive" /> {fails} to fix before sending</>
      ) : !state.ready ? (
        <><AlertTriangle className="size-3.5 text-amber-400" /> {warns} to review before sending</>
      ) : warns ? (
        <><AlertTriangle className="size-3.5 text-amber-400" /> Checks passed, {warns} to review</>
      ) : (
        <><CheckCircle2 className="size-3.5 text-emerald-400" /> Checks passed</>
      )}
    </button>
  )
}

// `onShow` takes the person to the entry or line a check is about.
export function ChecksPanel({ state, onShow }: { state: ChecksState | null; onShow?: (target: CheckTarget) => void }) {
  const [step, setStep] = useState<Record<string, number>>({})
  if (!state) {
    return <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Spinner /> Checking your PDF and testing links…</div>
  }
  if (state.error) return <p className="py-8 text-sm text-destructive">{state.error}</p>

  return (
    <div className="space-y-4">
      <Alert>
        <AlertTitle>{state.ready ? "Passed the automatic checks" : state.results.some((r) => r.status === "fail") ? "Fix these before you send it" : "Review these before you send it"}</AlertTitle>
        <AlertDescription>
          These check page fit, contact details, dates, links, sources and repeated or empty content, worst first. They can&apos;t judge whether it&apos;s persuasive, so read it once yourself before sending. You can always download.
        </AlertDescription>
      </Alert>
      <ul className="space-y-2">
        {state.results.map((r) => (
          <li key={r.id} className="flex items-start gap-2 text-sm">
            <span className="mt-0.5">{ICONS[r.status]}</span>
            <span>
              {r.label}
              {r.status === "not_checked" && <span className="text-muted-foreground"> (not checked)</span>}
              {r.detail && <span className="block text-muted-foreground">{r.detail}</span>}
              {onShow && r.status !== "pass" && !!r.targets?.length && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-1 -ml-2 h-7 px-2 text-xs"
                  onClick={() => {
                    // Each click goes to the next place this check is about.
                    const n = step[r.id] ?? 0
                    onShow(r.targets![n % r.targets!.length])
                    setStep((s) => ({ ...s, [r.id]: n + 1 }))
                  }}
                >
                  Show {r.targets.length > 1 ? `${((step[r.id] ?? 0) % r.targets.length) + 1} of ${r.targets.length}` : "me"} <ArrowRight />
                </Button>
              )}
            </span>
          </li>
        ))}
      </ul>
      <div>
        <h3 className="text-sm font-medium">Parser view</h3>
        <p className="mb-2 text-xs text-muted-foreground">The plain text our parser reads from your actual PDF. Applicant-tracking systems read the file the same way; each may map it to fields a little differently.</p>
        <pre className="max-h-96 overflow-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs whitespace-pre-wrap">{state.parserText}</pre>
      </div>
    </div>
  )
}

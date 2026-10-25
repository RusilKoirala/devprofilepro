"use client"

import { useState } from "react"
import { CheckCircle2, CircleDashed, CircleHelp, CirclePlus, RotateCcw, Scissors } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { requirementText, withoutRequirementClaims } from "@/lib/ai/tailor-check"
import { requirementOnPage, type PageEvidence } from "@/lib/record/evidence"

export { pageEvidence, type PageEvidence } from "@/lib/record/evidence"

export interface MatchView {
  // Unset for reports made before the evidence checks (lib/ai/tailor-check.ts MATCH_REPORT_VERSION).
  version?: number
  summary: string
  requirements: { text: string; status: "covered" | "unclear" | "elsewhere" | "not_found"; item_ids: string[]; fact_ids?: string[] }[]
  reasons: { item_id: string; reason: string }[]
  // The job post or request, when there is one.
  description?: string
}

const ICON = {
  covered: <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-400" />,
  partial: <CircleHelp className="mt-0.5 size-3.5 shrink-0 text-signal" />,
  cut: <Scissors className="mt-0.5 size-3.5 shrink-0 text-signal" />,
  lines_cut: <Scissors className="mt-0.5 size-3.5 shrink-0 text-signal" />,
  elsewhere: <CirclePlus className="mt-0.5 size-3.5 shrink-0 text-sky-400" />,
  missing: <CircleDashed className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />,
}

export function MatchReport({
  match,
  titles,
  page,
  compact = false,
  onShow,
  onAdd,
  onRecheck,
  rechecking = false,
}: {
  match: MatchView
  titles: Map<string, string>
  page: PageEvidence
  compact?: boolean
  // Take the person to a line on the resume.
  onShow?: (target: { itemId: string; bulletId?: string }) => void
  // Put an entry from the Career Record on this resume.
  onAdd?: (itemId: string) => void
  // Make a fresh, checked report for a report made before the checks.
  onRecheck?: () => void
  rechecking?: boolean
}) {
  const [showPost, setShowPost] = useState(false)
  const legacy = !match.version
  const names = (ids: string[]) => ids.map((id) => titles.get(id) ?? "an entry").join(", ")
  const onPageIds = new Set(page.entries.map((e) => e.itemId))
  // Explanations from before the checks may describe the wrong entry, so they aren't shown.
  const reasons = legacy ? [] : match.reasons.filter((r) => titles.has(r.item_id) && onPageIds.has(r.item_id) && r.reason).slice(0, compact ? 5 : undefined)
  const unexplained = legacy || compact ? [] : page.entries.filter((e) => !reasons.some((r) => r.item_id === e.itemId)).map((e) => titles.get(e.itemId)).filter(Boolean)

  return (
    <div className="space-y-4 text-sm">
      {legacy && (
        <div className="rounded-lg border border-signal/30 bg-signal/5 p-3 text-xs">
          <p className="text-foreground/90">This report was made before the current evidence checks.</p>
          <p className="mt-1 text-muted-foreground">Its explanations are hidden because they weren&apos;t checked against your facts, and its coverage is only approximate.</p>
          {onRecheck && (
            <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" disabled={rechecking} onClick={onRecheck}>
              {rechecking ? <Spinner /> : <RotateCcw />} Re-check against the job post
            </Button>
          )}
        </div>
      )}
      {/* Reports saved before these checks may carry verdicts in their text; they're cleaned here too. */}
      {match.summary && !legacy && withoutRequirementClaims(match.summary) && <p className="text-muted-foreground">{withoutRequirementClaims(match.summary)}</p>}
      {reasons.length > 0 && (
        <ul className="space-y-1">
          {reasons.map((p) => (
            <li key={p.item_id} className="text-muted-foreground"><span className="text-foreground/90">{titles.get(p.item_id)}</span> · {p.reason}</li>
          ))}
        </ul>
      )}
      {unexplained.length > 0 && <p className="text-xs text-muted-foreground">No checked explanation for {unexplained.join(", ")}.</p>}
      {match.requirements.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">{match.description ? "From the job post" : "What you asked for"}</p>
          <ul className="space-y-1.5">
            {match.requirements.map(({ text, ...rest }) => {
              const r = { ...rest, text: requirementText(text) }
              const shown = requirementOnPage(r, page, legacy)
              return (
                <li key={r.text} className="flex items-start gap-2">
                  {ICON[shown.state]}
                  <span className="min-w-0">
                    {r.text}
                    <span className="text-muted-foreground">
                      {shown.state === "missing" && " · not in your record yet"}
                      {shown.state === "cut" && ` · shown by ${names(shown.itemIds)}, which isn't on this page now`}
                      {shown.state === "lines_cut" && ` · cited from ${names(shown.itemIds)}, but nothing printed there names it now`}
                      {shown.state === "elsewhere" && ` · in your record (${names(shown.itemIds)}), not on this resume`}
                      {(shown.state === "covered" || shown.state === "partial") && ` · ${shown.state === "partial" ? "partly shown" : "shown"} by ${names(shown.itemIds)}`}
                    </span>
                    {(shown.state === "covered" || shown.state === "partial") && shown.line && !compact && (
                      onShow ? (
                        <button type="button" onClick={() => onShow({ itemId: shown.line!.itemId, bulletId: shown.line!.id })} className="mt-0.5 block text-left text-xs text-muted-foreground/80 italic underline-offset-4 hover:text-foreground hover:underline">
                          “{clip(shown.line.text)}”
                        </button>
                      ) : (
                        <span className="mt-0.5 block text-xs text-muted-foreground/80 italic">“{clip(shown.line.text)}”</span>
                      )
                    )}
                    {shown.state === "elsewhere" && onAdd && (
                      <span className="mt-1 flex flex-wrap gap-1.5">
                        {shown.itemIds.map((id) => (
                          <Button key={id} size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => onAdd(id)}>
                            <CirclePlus /> Add {titles.get(id) ?? "it"}
                          </Button>
                        ))}
                      </span>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
      {!compact && match.description && (
        <div>
          <button type="button" onClick={() => setShowPost((s) => !s)} className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline" aria-expanded={showPost}>
            {showPost ? "Hide the job post" : "Show the job post"}
          </button>
          {showPost && <p className="mt-2 max-h-96 overflow-y-auto rounded-xl bg-card p-3 text-xs whitespace-pre-wrap text-muted-foreground">{match.description}</p>}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {legacy
          ? "Not a guarantee of fit."
          : "Worked out from the lines on this page now: a requirement counts as shown only where a line or entry names what it asks for. Words can't prove depth of skill, so read the lines it points to. Not a guarantee of fit."}
      </p>
    </div>
  )
}

function clip(text: string) {
  return text.length > 110 ? `${text.slice(0, 107)}…` : text
}

"use client"

import { useState } from "react"
import { CheckCircle2, CircleDashed, CircleHelp, Scissors } from "lucide-react"

export interface MatchView {
  summary: string
  requirements: { text: string; status: "covered" | "not_found" | "unclear"; item_ids: string[] }[]
  reasons: { item_id: string; reason: string }[]
  // The job post or request, when there is one.
  description?: string
}

// What the job asks for against what is on the page now. Coverage is worked out from the current
// page, so a requirement whose evidence was cut to fit (or hidden later) says so.
export function MatchReport({ match, titles, onPage, compact = false }: { match: MatchView; titles: Map<string, string>; onPage: Set<string>; compact?: boolean }) {
  const [showPost, setShowPost] = useState(false)
  const reasons = match.reasons.filter((r) => titles.has(r.item_id) && onPage.has(r.item_id) && r.reason).slice(0, compact ? 5 : undefined)
  return (
    <div className="space-y-4 text-sm">
      {match.summary && <p className="text-muted-foreground">{match.summary}</p>}
      {reasons.length > 0 && (
        <ul className="space-y-1">
          {reasons.map((p) => (
            <li key={p.item_id} className="text-muted-foreground"><span className="text-foreground/90">{titles.get(p.item_id)}</span> · {p.reason}</li>
          ))}
        </ul>
      )}
      {match.requirements.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">From the job post</p>
          <ul className="space-y-1.5">
            {match.requirements.map((r) => {
              const shown = r.item_ids.filter((id) => onPage.has(id))
              const cut = r.status !== "not_found" && r.item_ids.length > 0 && !shown.length
              return (
                <li key={r.text} className="flex items-start gap-2">
                  {cut ? <Scissors className="mt-0.5 size-3.5 shrink-0 text-amber-400" /> : r.status === "covered" ? <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-400" /> : r.status === "unclear" ? <CircleHelp className="mt-0.5 size-3.5 shrink-0 text-amber-400" /> : <CircleDashed className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />}
                  <span className="min-w-0">
                    {r.text}
                    {cut ? (
                      <span className="text-muted-foreground"> · shown by {r.item_ids.map((id) => titles.get(id) ?? "an entry").join(", ")}, which isn&apos;t on this page now</span>
                    ) : r.status === "not_found" ? (
                      <span className="text-muted-foreground"> · not in your record yet</span>
                    ) : (
                      <span className="text-muted-foreground"> · {r.status === "unclear" ? "partly shown" : "shown"}{shown.length ? ` by ${shown.map((id) => titles.get(id)).filter(Boolean).join(", ")}` : ""}</span>
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
          {showPost && <p className="mt-2 max-h-96 overflow-y-auto rounded-lg border border-border p-3 text-xs whitespace-pre-wrap text-muted-foreground">{match.description}</p>}
        </div>
      )}
      <p className="text-xs text-muted-foreground">Checked against your facts, not a guarantee of fit. Coverage reflects what is on the page now.</p>
    </div>
  )
}

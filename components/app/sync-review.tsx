"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { updateItemDetails } from "@/lib/record/actions"
import type { DetailChange } from "@/lib/record/pipeline"
import { applyRewrite, proposeRewrites, type RewriteProposal } from "@/lib/record/refresh-actions"

const FIELD: Record<string, string> = { role: "Title", company: "Company", name: "Name", url: "Link", school: "School", degree: "Degree", details: "Details", location: "Location", start: "Start", end: "End" }

// What a sync found that would change existing entries. Nothing here is applied until the person says so.
export function SyncReview({ updatedIds, changes }: { updatedIds: string[]; changes: DetailChange[] }) {
  const router = useRouter()
  const [settled, setSettled] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<string | null>(null)
  const [proposals, setProposals] = useState<RewriteProposal[] | null>(null)
  const [skipped, setSkipped] = useState<string[]>([])
  const open = changes.filter((c) => !settled.has(`${c.item_id}:${c.field}`))
  const openProposals = (proposals ?? []).filter((p) => !settled.has(p.itemId))

  const settle = (key: string) => setSettled((s) => new Set(s).add(key))

  async function acceptChange(c: DetailChange) {
    const key = `${c.item_id}:${c.field}`
    setBusy(key)
    const res = await updateItemDetails(null, c.item_id, { [c.field]: c.found })
    setBusy(null)
    if (!res.ok) return void toast.error(res.error)
    settle(key)
    router.refresh()
  }

  async function suggest() {
    setBusy("suggest")
    const res = await proposeRewrites(updatedIds).catch(() => ({ ok: false as const, error: "We couldn't reach the server. Try again." }))
    setBusy(null)
    if (!res.ok) return void toast.error(res.error)
    setProposals(res.data.proposals)
    setSkipped(res.data.skipped)
    if (!res.data.proposals.length) toast("No better wording to suggest. Your lines already cover the new facts.")
  }

  async function accept(p: RewriteProposal) {
    setBusy(p.itemId)
    const res = await applyRewrite(p.itemId, p.after)
    setBusy(null)
    if (!res.ok) return void toast.error(res.error)
    settle(p.itemId)
    toast.success(`Updated “${p.title}” on every resume that uses its shared wording.`)
    router.refresh()
  }

  if (!open.length && !updatedIds.length) return null

  return (
    <div className="space-y-4 border-t border-border pt-4">
      {open.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Details that changed</p>
          <div className="divide-y divide-border rounded-lg border border-border">
            {open.map((c) => {
              const key = `${c.item_id}:${c.field}`
              return (
                <div key={key} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate"><span className="text-muted-foreground">{c.title} · {FIELD[c.field] ?? c.field}:</span> <s className="text-muted-foreground">{c.current}</s> → {c.found}</p>
                    <p className="text-xs text-muted-foreground">From {c.source}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => settle(key)}>Keep current</Button>
                    <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => acceptChange(c)}>{busy === key && <Spinner />} Use new</Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {updatedIds.length > 0 && proposals == null && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <p className="min-w-0 flex-1 text-muted-foreground">
            {updatedIds.length === 1 ? "One entry" : `${updatedIds.length} entries`} gained facts, but existing lines aren&apos;t changed automatically.
          </p>
          <Button size="sm" variant="secondary" disabled={!!busy} onClick={suggest}>{busy === "suggest" && <Spinner />} Suggest new wording</Button>
        </div>
      )}

      {openProposals.map((p) => (
        <div key={p.itemId} className="rounded-lg border border-border">
          <p className="border-b border-border px-3 py-2 text-sm font-medium">{p.title}</p>
          <div className="grid gap-px bg-border text-sm sm:grid-cols-2">
            <Lines label="Now" lines={p.before} muted />
            <Lines label="Suggested" lines={p.after.map((b) => b.text)} />
          </div>
          <div className="flex justify-end gap-1 border-t border-border px-3 py-2">
            <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => settle(p.itemId)}>Keep current</Button>
            <Button size="sm" disabled={!!busy} onClick={() => accept(p)}>{busy === p.itemId && <Spinner />} Use suggested</Button>
          </div>
        </div>
      ))}
      {skipped.length > 0 && <p className="text-xs text-muted-foreground">Left alone because you edited their lines yourself: {skipped.join(", ")}. Use “Rewrite lines” on the resume if you want new wording.</p>}
    </div>
  )
}

function Lines({ label, lines, muted = false }: { label: string; lines: string[]; muted?: boolean }) {
  return (
    <div className="bg-card px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <ul className={`mt-1.5 list-disc space-y-1 pl-4 ${muted ? "text-muted-foreground" : ""}`}>
        {lines.map((l, n) => <li key={n}>{l}</li>)}
      </ul>
    </div>
  )
}

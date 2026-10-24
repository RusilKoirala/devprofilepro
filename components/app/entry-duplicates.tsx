"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Spinner } from "@/components/ui/spinner"
import { markDistinct, mergeEntries } from "@/lib/record/merge-actions"

export interface DuplicateEntryView {
  id: string
  title: string
  // Editable fields as text, e.g. { role: "Full Stack Developer", start: "Jan 2023" }.
  fields: Record<string, string>
  // Where its facts came from: "LinkedIn PDF, read Oct 3".
  sources: string[]
  facts: number
}

export interface DuplicatePairView {
  why: string
  kind: string
  a: DuplicateEntryView
  b: DuplicateEntryView
}

const LABELS: Record<string, string> = {
  role: "Title", company: "Company", name: "Name", url: "Link", school: "School", degree: "Degree", details: "Details",
  location: "Location", start: "Start", end: "End", tech: "Tech", category: "Group", skills: "Skills",
}
const LISTS = new Set(["tech", "skills"])

// "These look like the same job": review side by side, pick the right value where they differ, merge.
export function EntryDuplicates({ pairs }: { pairs: DuplicatePairView[] }) {
  const [open, setOpen] = useState<DuplicatePairView | null>(null)
  if (!pairs.length) return null
  return (
    <div className="divide-y divide-border rounded-2xl bg-card">
      {pairs.map((p) => (
        <div key={`${p.a.id}-${p.b.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
          <div className="min-w-0 flex-1">
            <p className="truncate">
              <span className="font-medium">{p.a.title}</span> <span className="text-muted-foreground">and</span> <span className="font-medium">{p.b.title}</span>
            </p>
            <p className="text-xs text-muted-foreground">Possibly the same {p.kind}. {p.why}.</p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setOpen(p)}>Review</Button>
        </div>
      ))}
      {open && <MergeDialog pair={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

function MergeDialog({ pair, onClose }: { pair: DuplicatePairView; onClose: () => void }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  // Keep the entry with more evidence; its id survives.
  const [keep, other] = pair.a.facts >= pair.b.facts ? [pair.a, pair.b] : [pair.b, pair.a]
  const keys = [...new Set([...Object.keys(keep.fields), ...Object.keys(other.fields)])]
  const differing = keys.filter((k) => (keep.fields[k] ?? "") !== (other.fields[k] ?? "") && (keep.fields[k] || other.fields[k]))
  const [choice, setChoice] = useState<Record<string, "keep" | "other">>(() => Object.fromEntries(differing.map((k) => [k, keep.fields[k] ? "keep" : "other"])))

  function done(message: string) {
    toast.success(message)
    onClose()
    router.refresh()
  }

  function merge() {
    const fields = Object.fromEntries(
      differing.map((k) => {
        const v = (choice[k] === "other" ? other : keep).fields[k] ?? ""
        return [k, LISTS.has(k) ? v.split(/\s*,\s*/).filter(Boolean) : v || null]
      })
    )
    startTransition(async () => {
      const res = await mergeEntries(keep.id, other.id, fields)
      if (!res.ok) return void toast.error(res.error)
      done("Merged. Every resume now uses the one entry.")
    })
  }

  function different() {
    startTransition(async () => {
      const res = await markDistinct(keep.id, other.id)
      if (!res.ok) return void toast.error(res.error)
      done("Got it. We won't suggest these again.")
    })
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Same {pair.kind}?</DialogTitle>
          <DialogDescription>{pair.why}. Merging keeps every fact and your own lines from both. Where they disagree, pick the right one.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 text-sm">
          {[keep, other].map((e) => (
            <div key={e.id} className="rounded-xl bg-card p-3">
              <p className="font-medium">{e.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{e.facts} fact{e.facts === 1 ? "" : "s"}{e.sources.length ? ` · from ${e.sources.join("; ")}` : ""}</p>
            </div>
          ))}
        </div>

        {differing.length > 0 ? (
          <div className="divide-y divide-border rounded-xl bg-card">
            {differing.map((k) => (
              <RadioGroup key={k} value={choice[k]} onValueChange={(v) => setChoice((c) => ({ ...c, [k]: v as "keep" | "other" }))} className="grid grid-cols-[5rem_1fr_1fr] items-center gap-3 px-3 py-2.5 text-sm" aria-label={LABELS[k] ?? k}>
                <span className="text-muted-foreground">{LABELS[k] ?? k}</span>
                {(["keep", "other"] as const).map((side) => {
                  const value = (side === "keep" ? keep : other).fields[k]
                  const id = `${k}-${side}`
                  return (
                    <label key={side} htmlFor={id} className="flex min-w-0 cursor-pointer items-start gap-2">
                      <RadioGroupItem id={id} value={side} className="mt-0.5" />
                      <span className={`min-w-0 break-words ${value ? "" : "text-muted-foreground italic"}`}>{value || "empty"}</span>
                    </label>
                  )
                })}
              </RadioGroup>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Their details match. Only the facts differ.</p>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" disabled={pending} onClick={different}>They&apos;re different</Button>
          <Button disabled={pending} onClick={merge}>{pending && <Spinner />} Merge into one</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

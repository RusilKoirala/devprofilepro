"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { deleteAllData, removeSource } from "@/lib/record/data-actions"

export interface SourceListItem {
  id: string
  label: string
  kind: string
  read: string
  facts: number
}

const KIND: Record<string, string> = { github: "GitHub", resume_pdf: "PDF", linkedin_pdf: "LinkedIn", paste: "Notes", pr_link: "Pull request", win: "Note" }

// Every source one by one, with remove; a full backup; and deleting everything.
export function DataControls({ sources }: { sources: SourceListItem[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [removing, setRemoving] = useState<SourceListItem | null>(null)
  const [wiping, setWiping] = useState(false)
  const [confirm, setConfirm] = useState("")

  function remove(source: SourceListItem) {
    setRemoving(null)
    startTransition(async () => {
      const res = await removeSource(source.id)
      if (!res.ok) return void toast.error(res.error)
      toast.success(`Removed ${source.label}`, { description: `${res.data.facts} facts${res.data.entries ? ` and ${res.data.entries} entries that only it supported` : ""} were deleted. Your resumes were re-fitted.${res.data.review ? ` ${res.data.review} line${res.data.review === 1 ? "" : "s"} also cited other sources and stayed; your resume checks ask you to confirm each still holds.` : ""}` })
      router.refresh()
    })
  }

  function wipe() {
    startTransition(async () => {
      const res = await deleteAllData(confirm)
      if (!res.ok) return void toast.error(res.error)
      setWiping(false)
      toast.success("All your DevProfile data was deleted.")
      router.push("/start")
    })
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-medium">Your data</h2>
        <p className="text-sm text-muted-foreground">
          What you gave us is used only to write your resumes. See <Link href="/privacy" className="underline underline-offset-4">how we handle it</Link>.
        </p>
      </div>
      <div className="divide-y divide-border rounded-2xl border border-border bg-card">
        <Collapsible>
          <CollapsibleTrigger className="flex w-full items-center justify-between p-4 text-left text-sm">
            <span><span className="font-medium">Sources</span> <span className="text-muted-foreground">· {sources.length} read so far</span></span>
            <span className="text-xs text-muted-foreground">Show</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="divide-y divide-border border-t border-border">
              {sources.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{KIND[s.kind] ?? s.kind} · read {s.read} · {s.facts} fact{s.facts === 1 ? "" : "s"}</p>
                  </div>
                  <Button size="sm" variant="ghost" disabled={pending} onClick={() => setRemoving(s)} aria-label={`Remove ${s.label}`}><Trash2 /> Remove</Button>
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
        <div className="flex flex-wrap items-center gap-3 p-4 text-sm">
          <p className="min-w-0 flex-1 text-muted-foreground">Delete your sources, uploaded files, Career Record, resumes and downloaded PDFs. This can&apos;t be undone.</p>
          <Button size="sm" variant="ghost" className="text-destructive" disabled={pending} onClick={() => setWiping(true)}><Trash2 /> Delete everything</Button>
        </div>
      </div>

      <Dialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove {removing?.label}?</DialogTitle>
            <DialogDescription>
              Its {removing?.facts ?? 0} facts are deleted, along with lines and entries that only it supported. Lines that also cite another source stay, flagged so you can check the whole line is still true. Your saved resumes update; PDFs you already downloaded are snapshots and don&apos;t change.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRemoving(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => removing && remove(removing)}>Remove source</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={wiping} onOpenChange={setWiping}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete all your DevProfile data?</DialogTitle>
            <DialogDescription>
              Everything goes, including downloaded PDFs we kept for you. Download your data first if you might want it. Your sign-in account and payment records stay. Deleting the account itself (account menu) also deletes everything here.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-delete">Type DELETE to confirm</Label>
            <Input id="confirm-delete" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setWiping(false)}>Cancel</Button>
            <Button variant="destructive" disabled={confirm !== "DELETE" || pending} onClick={wipe}>{pending && <Spinner />} Delete everything</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

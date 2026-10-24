"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { StickyNote } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { APPLICATION_STATUSES, STATUS_LABELS, type ApplicationStatus } from "@/lib/applications"
import { updateExport } from "@/lib/record/actions"

export interface ExportView {
  id: string
  filename: string
  resume: string
  createdAt: string
  sentAt: string | null
  sentTo: string | null
  status: ApplicationStatus | null
  notes: string | null
}

const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })

// Every downloaded file, where it went, and how that application is going.
export function ExportsTable({ exports }: { exports: ExportView[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [notesFor, setNotesFor] = useState<ExportView | null>(null)

  function save(id: string, patch: Parameters<typeof updateExport>[1], after?: () => void) {
    startTransition(async () => {
      const res = await updateExport(id, patch)
      if (!res.ok) return void toast.error(res.error)
      after?.()
      router.refresh()
    })
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>File</TableHead>
            <TableHead>Sent to</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {exports.map((e) => (
            <TableRow key={e.id}>
              <TableCell>
                <p className="font-medium">{e.filename}</p>
                <p className="text-xs text-muted-foreground">{e.resume} · downloaded {day(e.createdAt)}{e.sentAt ? ` · sent ${day(e.sentAt)}` : ""}</p>
              </TableCell>
              <TableCell className="min-w-44">
                <SentTo value={e.sentTo} label={`Where ${e.filename} was sent`} disabled={pending} onSave={(sentTo) => save(e.id, { sentTo })} />
              </TableCell>
              <TableCell>
                <Select value={e.status ?? "none"} disabled={pending} onValueChange={(v) => save(e.id, { status: v === "none" ? null : (v as ApplicationStatus) })}>
                  <SelectTrigger size="sm" className="w-36" aria-label={`Status of ${e.filename}`}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not sent</SelectItem>
                    {APPLICATION_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="text-right whitespace-nowrap">
                <Button size="sm" variant="ghost" className={e.notes ? "" : "text-muted-foreground"} onClick={() => setNotesFor(e)} aria-label={`Notes for ${e.filename}`} title={e.notes ?? "Add notes"}>
                  <StickyNote /> {e.notes ? "Notes" : "Add notes"}
                </Button>
                <Button asChild size="sm" variant="ghost"><a href={`/api/exports/${e.id}`}>Download</a></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {notesFor && <NotesDialog key={notesFor.id} row={notesFor} pending={pending} onClose={() => setNotesFor(null)} onSave={(notes) => save(notesFor.id, { notes }, () => setNotesFor(null))} />}
    </>
  )
}

function NotesDialog({ row, pending, onClose, onSave }: { row: ExportView; pending: boolean; onClose: () => void; onSave: (notes: string) => void }) {
  const [text, setText] = useState(row.notes ?? "")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Notes</DialogTitle>
          <DialogDescription>{row.sentTo ? `For ${row.sentTo}` : row.filename}. Only you see these.</DialogDescription>
        </DialogHeader>
        <Textarea aria-label="Notes" rows={5} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Recruiter's name, interview dates, what they asked…" autoFocus />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={pending} onClick={() => onSave(text)}>{pending && <Spinner />} Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Company, job link or a note. Saving it also marks the file as sent.
function SentTo({ value, label, disabled, onSave }: { value: string | null; label: string; disabled: boolean; onSave: (to: string) => void }) {
  const [text, setText] = useState(value ?? "")
  const commit = () => text.trim() !== (value ?? "") && onSave(text.trim())
  return (
    <Input
      aria-label={label}
      value={text}
      disabled={disabled}
      maxLength={300}
      placeholder="Company or job link"
      className="h-8 text-sm"
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
    />
  )
}

"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { markSent } from "@/lib/record/actions"

export interface ExportView {
  id: string
  filename: string
  resume: string
  createdAt: string
  sentAt: string | null
  sentTo: string | null
}

export function ExportsTable({ exports }: { exports: ExportView[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function save(id: string, sent: boolean, sentTo?: string) {
    startTransition(async () => {
      const res = await markSent(id, sent, sentTo)
      if (!res.ok) return void toast.error(res.error)
      router.refresh()
    })
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>File</TableHead>
          <TableHead>Resume</TableHead>
          <TableHead>Downloaded</TableHead>
          <TableHead>Sent</TableHead>
          <TableHead>Sent to</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {exports.map((e) => (
          <TableRow key={e.id}>
            <TableCell className="font-medium">{e.filename}</TableCell>
            <TableCell className="text-muted-foreground">{e.resume}</TableCell>
            <TableCell className="text-muted-foreground">{new Date(e.createdAt).toLocaleDateString()}</TableCell>
            <TableCell>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={!!e.sentAt} disabled={pending} onCheckedChange={(v) => save(e.id, v === true)} />
                {e.sentAt ? new Date(e.sentAt).toLocaleDateString() : "Mark as sent"}
              </label>
            </TableCell>
            <TableCell className="min-w-48">
              <SentTo value={e.sentTo} label={`Where ${e.filename} was sent`} disabled={pending} onSave={(to) => save(e.id, true, to)} />
            </TableCell>
            <TableCell className="text-right">
              <Button asChild size="sm" variant="ghost"><a href={`/api/exports/${e.id}`}>Download</a></Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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
      onKeyDown={(e) => e.key === "Enter" && (e.currentTarget.blur())}
    />
  )
}

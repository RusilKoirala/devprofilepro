"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { markSent } from "@/lib/record/actions"

export interface ExportView {
  id: string
  filename: string
  resume: string
  createdAt: string
  sentAt: string | null
}

export function ExportsTable({ exports }: { exports: ExportView[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function toggle(id: string, sent: boolean) {
    startTransition(async () => {
      const res = await markSent(id, sent)
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
                <Checkbox checked={!!e.sentAt} disabled={pending} onCheckedChange={(v) => toggle(e.id, v === true)} />
                {e.sentAt ? new Date(e.sentAt).toLocaleDateString() : "Mark as sent"}
              </label>
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

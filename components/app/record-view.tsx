"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Eye, EyeOff, Pin, PinOff, Plus } from "lucide-react"
import { toast } from "sonner"
import { FactChip, type FactView } from "@/components/app/fact-chip"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { addManualItem, setItemState } from "@/lib/record/actions"
import type { ItemType } from "@/lib/record/types"

export interface RecordItemView {
  id: string
  type: ItemType
  title: string
  detail: string
  status: "suggested" | "shown" | "hidden"
  pinned: boolean
  reason: string | null
  rank: number
  facts: FactView[]
}

const GROUPS: { type: ItemType; title: string }[] = [
  { type: "contact", title: "Contact" },
  { type: "job", title: "Experience" },
  { type: "project", title: "Projects" },
  { type: "education", title: "Education" },
  { type: "skills", title: "Skills" },
  { type: "award", title: "Awards" },
]

export function RecordView({ items, baseResumeId, sourceCount }: { items: RecordItemView[]; baseResumeId: string | null; sourceCount: number }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function update(id: string, patch: { pinned?: boolean; status?: "shown" | "hidden" }) {
    startTransition(async () => {
      const res = await setItemState(baseResumeId, id, patch)
      if (!res.ok) return void toast.error(res.error)
      router.refresh()
    })
  }

  return (
    <div className="mt-6 space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <AddItemDialog />
        <Button asChild variant="outline"><Link href="/start">Add a source</Link></Button>
        {baseResumeId && <Button asChild variant="ghost"><Link href={`/resume/${baseResumeId}`}>Open base resume</Link></Button>}
        <span className="ml-auto text-sm text-muted-foreground">{sourceCount} sources</span>
      </div>

      {items.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Nothing here yet</EmptyTitle>
            <EmptyDescription>Add a source and build your resume, or add a job or project by hand.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {GROUPS.map((g) => {
        const group = items.filter((i) => i.type === g.type)
        if (!group.length) return null
        return (
          <section key={g.type} className="space-y-3">
            <h2 className="text-xs font-medium tracking-wider text-muted-foreground uppercase">{g.title}</h2>
            {group.map((item) => (
              <div key={item.id} className={`rounded-xl border border-border bg-card p-4 ${item.status === "hidden" ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-medium">
                      {item.title}
                      {item.status === "hidden" && <Badge variant="outline">Hidden</Badge>}
                      {item.pinned && <Badge variant="outline">Pinned</Badge>}
                    </div>
                    {item.detail && <div className="text-sm text-muted-foreground">{item.detail}</div>}
                    {item.reason && <div className="mt-1 text-xs text-muted-foreground">Why: {item.reason}</div>}
                  </div>
                  {item.type !== "contact" && (
                    <div className="flex shrink-0 gap-1">
                      <Button size="sm" variant="ghost" disabled={pending} onClick={() => update(item.id, { pinned: !item.pinned })}>
                        {item.pinned ? <PinOff /> : <Pin />} {item.pinned ? "Unpin" : "Pin"}
                      </Button>
                      <Button size="sm" variant="ghost" disabled={pending} onClick={() => update(item.id, { status: item.status === "hidden" ? "shown" : "hidden" })}>
                        {item.status === "hidden" ? <Eye /> : <EyeOff />} {item.status === "hidden" ? "Show" : "Hide"}
                      </Button>
                    </div>
                  )}
                </div>
                {item.facts.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {item.facts.map((f) => (
                      <li key={f.id} className="flex items-start justify-between gap-3 text-sm">
                        <span>{f.text}</span>
                        <FactChip fact={f} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>
        )
      })}
    </div>
  )
}

function AddItemDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<"job" | "project" | "education" | "award">("project")
  const [pending, startTransition] = useTransition()

  function submit(formData: FormData) {
    const get = (k: string) => String(formData.get(k) ?? "").trim() || null
    const data =
      type === "job"
        ? { role: get("title"), company: get("org"), location: get("location"), start: get("start"), end: get("end") }
        : type === "education"
          ? { school: get("org"), degree: get("title"), location: get("location"), start: get("start"), end: get("end") }
          : { name: get("title"), url: get("url"), tech: get("tech")?.split(/,\s*/) ?? null, start: get("start"), end: get("end") }
    const facts = String(formData.get("facts") ?? "").split("\n").map((s) => s.trim()).filter((s) => s.length >= 3)
    startTransition(async () => {
      const res = await addManualItem({ type, data, facts })
      if (!res.ok) return void toast.error(res.error)
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus /> Add by hand</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a job, project or school</DialogTitle>
          <DialogDescription>For private work or anything not in your files. Saved as “You told us”.</DialogDescription>
        </DialogHeader>
        <form action={submit} className="space-y-3">
          <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="project">Project</SelectItem>
              <SelectItem value="job">Job</SelectItem>
              <SelectItem value="education">Education</SelectItem>
              <SelectItem value="award">Award</SelectItem>
            </SelectContent>
          </Select>
          <div className="space-y-1.5">
            <Label htmlFor="title">{type === "job" ? "Role" : type === "education" ? "Degree" : "Name"}</Label>
            <Input id="title" name="title" required />
          </div>
          {(type === "job" || type === "education") && (
            <div className="space-y-1.5">
              <Label htmlFor="org">{type === "job" ? "Company" : "School"}</Label>
              <Input id="org" name="org" required />
            </div>
          )}
          {type === "project" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label htmlFor="url">Link</Label><Input id="url" name="url" type="url" /></div>
              <div className="space-y-1.5"><Label htmlFor="tech">Tech (comma separated)</Label><Input id="tech" name="tech" /></div>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label htmlFor="start">Start</Label><Input id="start" name="start" placeholder="Jun 2024" /></div>
            <div className="space-y-1.5"><Label htmlFor="end">End</Label><Input id="end" name="end" placeholder="Present" /></div>
            {type !== "project" && type !== "award" && <div className="space-y-1.5"><Label htmlFor="location">Location</Label><Input id="location" name="location" /></div>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="facts">What you did, one per line</Label>
            <Textarea id="facts" name="facts" rows={4} placeholder={"Built the billing page with Stripe\n~200 paying users"} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>Add</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

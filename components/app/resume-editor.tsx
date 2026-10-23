"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { ChevronDown, Download, EyeOff, Pin, PinOff, RefreshCw, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { ChecksPanel } from "@/components/app/checks-panel"
import { FactChip, type FactView } from "@/components/app/fact-chip"
import { QuestionsPanel, type QuestionView } from "@/components/app/questions-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { editBullet, regenerateItem, restoreCut, setItemState, type ActionResult } from "@/lib/record/actions"
import { OVERLEAF_URL } from "@/lib/resume/latex"

export interface EditorData {
  resumeId: string
  title: string
  version: string
  sections: {
    type: string
    title: string
    entries: {
      itemId: string
      title: string
      subtitle: string
      pinned: boolean
      bullets: { id: string; text: string; userEdited: boolean; facts: FactView[] }[]
    }[]
  }[]
  cuts: { itemId: string; bulletText: string | null; title: string; reason: string }[]
  questions: QuestionView[]
}

export function ResumeEditor({ data }: { data: EditorData }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [downloading, setDownloading] = useState(false)

  function run(action: () => Promise<ActionResult>, success?: string) {
    startTransition(async () => {
      const res = await action()
      if (!res.ok) return void toast.error(res.error)
      if (success) toast.success(success)
      router.refresh()
    })
  }

  async function download() {
    setDownloading(true)
    try {
      const res = await fetch(`/api/pdf/${data.resumeId}`, { method: "POST" })
      if (!res.ok) throw new Error(await res.text())
      const name = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ?? "Resume.pdf"
      const url = URL.createObjectURL(await res.blob())
      const a = Object.assign(document.createElement("a"), { href: url, download: name })
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Saved to your exports. You can always re-download this exact file from Home.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed")
    } finally {
      setDownloading(false)
    }
  }

  async function openInOverleaf() {
    const tex = await (await fetch(`/api/tex/${data.resumeId}`)).text()
    const form = Object.assign(document.createElement("form"), { method: "POST", action: OVERLEAF_URL, target: "_blank" })
    form.append(Object.assign(document.createElement("input"), { type: "hidden", name: "encoded_snip", value: encodeURIComponent(tex) }))
    document.body.append(form)
    form.submit()
    form.remove()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-medium">{data.title}</h2>
          {pending && <Spinner className="text-muted-foreground" />}
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={download} disabled={downloading || pending}>
            {downloading ? <Spinner /> : <Download />} Download PDF
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">More <ChevronDown /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild><a href={`/api/tex/${data.resumeId}`}>Download .tex</a></DropdownMenuItem>
              <DropdownMenuItem onSelect={openInOverleaf}>Open in Overleaf</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><a href="/api/data">Download my data (JSON)</a></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Editor */}
        <div className="space-y-6">
          {data.sections.map((section) => (
            <section key={section.type} className="space-y-3">
              <h2 className="text-xs font-medium tracking-wider text-muted-foreground uppercase">{section.title}</h2>
              {section.entries.map((entry) => (
                <div key={entry.itemId} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium">{entry.title}</div>
                      {entry.subtitle && <div className="truncate text-sm text-muted-foreground">{entry.subtitle}</div>}
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <IconButton label={entry.pinned ? "Unpin" : "Pin (never cut)"} onClick={() => run(() => setItemState(data.resumeId, entry.itemId, { pinned: !entry.pinned }))}>
                        {entry.pinned ? <PinOff /> : <Pin />}
                      </IconButton>
                      {section.type !== "education" && section.type !== "skills" && (
                        <IconButton label="Rewrite bullets" onClick={() => run(() => regenerateItem(data.resumeId, entry.itemId), "Rewritten")}>
                          <RefreshCw />
                        </IconButton>
                      )}
                      <IconButton label="Hide from resume" onClick={() => run(() => setItemState(data.resumeId, entry.itemId, { status: "hidden" }))}>
                        <EyeOff />
                      </IconButton>
                    </div>
                  </div>
                  {entry.bullets.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {entry.bullets.map((b) => (
                        <BulletRow key={b.id} bullet={b} disabled={pending} onSave={(text) => run(() => editBullet(data.resumeId, b.id, text))} />
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </section>
          ))}

          {data.cuts.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Cut to fit one page</h2>
              {data.cuts.map((c, i) => (
                <div key={i} className="flex items-start justify-between gap-3 rounded-lg border border-dashed border-border p-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium">{c.title}</div>
                    {c.bulletText && <div className="text-muted-foreground">“{c.bulletText}”</div>}
                    <div className="text-xs text-muted-foreground">{c.reason}</div>
                  </div>
                  <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => restoreCut(data.resumeId, c.itemId), "Restored and pinned")}>
                    <RotateCcw /> Restore
                  </Button>
                </div>
              ))}
            </section>
          )}
          <p className="text-sm text-muted-foreground">
            Hidden items and everything else we found are in your <Link href="/record" className="underline underline-offset-4">Career Record</Link>.
          </p>
        </div>

        {/* Preview + tabs */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <Tabs defaultValue="preview">
            <TabsList>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="questions">
                Questions {data.questions.length > 0 && <Badge variant="secondary" className="ml-1">{data.questions.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="checks">Checks</TabsTrigger>
            </TabsList>
            <TabsContent value="preview">
              <iframe
                key={data.version}
                title="Resume preview"
                src={`/api/pdf/${data.resumeId}?v=${encodeURIComponent(data.version)}#toolbar=0&view=FitH`}
                className="aspect-[8.5/11] w-full rounded-xl border border-border bg-white"
              />
            </TabsContent>
            <TabsContent value="questions">
              <QuestionsPanel resumeId={data.resumeId} questions={data.questions} />
            </TabsContent>
            <TabsContent value="checks">
              <ChecksPanel resumeId={data.resumeId} version={data.version} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="icon" variant="ghost" className="size-8 text-muted-foreground" onClick={onClick} aria-label={label}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function BulletRow({ bullet, disabled, onSave }: { bullet: EditorData["sections"][number]["entries"][number]["bullets"][number]; disabled: boolean; onSave: (text: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(bullet.text)

  if (editing) {
    return (
      <li className="space-y-2">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} autoFocus />
        <div className="flex gap-2">
          <Button size="sm" disabled={disabled} onClick={() => { onSave(text); setEditing(false) }}>Save</Button>
          <Button size="sm" variant="ghost" onClick={() => { setText(bullet.text); setEditing(false) }}>Cancel</Button>
        </div>
      </li>
    )
  }

  return (
    <li className="group text-sm leading-relaxed">
      <button type="button" className="text-left hover:text-foreground/80" onClick={() => setEditing(true)} title="Click to edit">
        {bullet.text}
      </button>
      <span className="mt-1 flex flex-wrap gap-1">
        {bullet.facts.map((f) => <FactChip key={f.id} fact={f} />)}
        {bullet.userEdited && <Badge variant="outline" className="text-[10px]">edited by you</Badge>}
      </span>
    </li>
  )
}

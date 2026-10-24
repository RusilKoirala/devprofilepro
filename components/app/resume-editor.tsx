"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useRef, useState, useTransition } from "react"
import { Archive, ArrowDown, ArrowUp, Copy, Download, EyeOff, FileCheck, GripVertical, Lightbulb, MessageSquare, MoreHorizontal, Palette, Pencil, Pin, PinOff, Plus, RotateCcw, Trash2, Wand2 } from "lucide-react"
import { toast } from "sonner"
import { ChecksPanel, useResumeChecks, type CheckTarget } from "@/components/app/checks-panel"
import { DeleteResumeDialog } from "@/components/app/delete-resume-dialog"
import { FactChip, type FactView } from "@/components/app/fact-chip"
import { offerUpgrade } from "@/components/app/upgrade-prompt"
import { MatchReport, type MatchView, type PageEvidence } from "@/components/app/match-report"
import { QuestionCard, type QuestionView } from "@/components/app/questions-panel"
import { ResumeChat, type ChatMessageView } from "@/components/app/resume-chat"
import { ResumeThumbnail } from "@/components/app/resume-thumbnail"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  addBullet, archiveResume, deleteBullet, duplicateResume, editBullet, keepLine, recheckMatch, regenerateItem, renameResume, restoreBullet, restoreCut, setItemOrder, setItemState, setSectionOrder, setTemplate, updateHeader, updateItemDetails, type ActionResult,
} from "@/lib/record/actions"
import { REWRITE_LABELS, type RewriteStyle } from "@/lib/record/rewrite-styles"
import type { ItemType } from "@/lib/record/types"
import { displayUrl } from "@/lib/resume/build"
import { bulletHint } from "@/lib/resume/hints"
import { OVERLEAF_URL } from "@/lib/resume/latex"
import type { ResumeDoc } from "@/lib/resume/schema"
import { TEMPLATES, type TemplateId } from "@/lib/resume/templates"

type Details = Record<"role" | "company" | "name" | "url" | "school" | "degree" | "details" | "category" | "location" | "start" | "end" | "tech" | "skills", string>

export interface EditorData {
  resumeId: string
  kind: "base" | "tailored"
  archived: boolean
  title: string
  version: string
  // Tailored from a job post or request: what it asked for and how this resume covers it.
  match: MatchView | null
  // What the PDF prints now, for the match report (lib/record/evidence.ts).
  page: PageEvidence
  titles: Record<string, string>
  // What the page prints, for the design picker's previews.
  doc: ResumeDoc
  chat: ChatMessageView[]
  header: { name: string; headline: string; targetRole: string; email: string; phone: string; location: string; website: string; github: string; linkedin: string }
  sections: {
    type: Exclude<ItemType, "contact">
    title: string
    entries: {
      itemId: string
      title: string
      subtitle: string
      pinned: boolean
      reason: string | null
      details: Details
      questions: QuestionView[]
      bullets: { id: string; text: string; userEdited: boolean; ownCopy: boolean; facts: FactView[] }[]
    }[]
  }[]
  cuts: { itemId: string; bulletText: string | null; title: string; reason: string }[]
  otherQuestions: QuestionView[]
}

type Entry = EditorData["sections"][number]["entries"][number]
type SectionType = EditorData["sections"][number]["type"]
type Run = <T>(action: () => Promise<ActionResult<T>>, after?: (data: T) => void) => void

export function ResumeEditor({ data }: { data: EditorData }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [downloading, setDownloading] = useState(false)
  const [tab, setTab] = useState("preview")
  // Phones show one column at a time: the editor or the page (preview, checks, match).
  const [pane, setPane] = useState<"editor" | "page">("editor")
  const [renaming, setRenaming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const tailored = data.kind === "tailored"
  // The chat swaps in for the editor column, so the live preview stays in view while you talk.
  const [mode, setMode] = useState<"edit" | "chat">("edit")
  const [chatBusy, setChatBusy] = useState(false)
  const checks = useResumeChecks(data.resumeId, data.version)
  // Optimistic section order while the save + re-fit runs; dropped once the refreshed data arrives.
  const [localOrder, setLocalOrder] = useState<{ version: string; types: SectionType[] } | null>(null)
  const [drag, setDrag] = useState<{ type: SectionType; over: SectionType | null; after: boolean } | null>(null)
  // Same idea for entries inside a section.
  const [localItems, setLocalItems] = useState<{ version: string; ids: string[] } | null>(null)
  const [entryDrag, setEntryDrag] = useState<{ section: SectionType; id: string; over: string | null; after: boolean } | null>(null)
  const itemIndex = localItems?.version === data.version ? new Map(localItems.ids.map((id, n) => [id, n])) : null
  const sections = (localOrder?.version === data.version
    ? [...data.sections].sort((a, b) => localOrder.types.indexOf(a.type) - localOrder.types.indexOf(b.type))
    : data.sections
  ).map((s) => (itemIndex ? { ...s, entries: [...s.entries].sort((a, b) => (itemIndex.get(a.itemId) ?? 0) - (itemIndex.get(b.itemId) ?? 0)) } : s))

  const run: Run = (action, after) => {
    startTransition(async () => {
      const res = await action()
      if (!res.ok) return void (offerUpgrade(res) || toast.error(res.error))
      after?.(res.data)
      router.refresh()
    })
  }

  function reorder(types: SectionType[]) {
    if (types.join() === sections.map((s) => s.type).join()) return
    setLocalOrder({ version: data.version, types })
    startTransition(async () => {
      const res = await setSectionOrder(data.resumeId, types)
      if (!res.ok) {
        setLocalOrder(null)
        return void toast.error(res.error)
      }
      router.refresh()
    })
  }

  function move(type: SectionType, to: number) {
    const types = sections.map((s) => s.type).filter((t) => t !== type)
    types.splice(Math.max(0, Math.min(to, types.length)), 0, type)
    reorder(types)
  }

  function moveEntry(section: SectionType, id: string, to: number) {
    const current = sections.find((s) => s.type === section)!.entries.map((e) => e.itemId)
    const ids = current.filter((x) => x !== id)
    ids.splice(Math.max(0, Math.min(to, ids.length)), 0, id)
    if (ids.join() === current.join()) return
    const all = sections.flatMap((s) => (s.type === section ? ids : s.entries.map((e) => e.itemId)))
    setLocalItems({ version: data.version, ids: all })
    startTransition(async () => {
      const res = await setItemOrder(data.resumeId, ids)
      if (!res.ok) {
        setLocalItems(null)
        return void toast.error(res.error)
      }
      router.refresh()
    })
  }

  function dropEntry() {
    const d = entryDrag
    setEntryDrag(null)
    if (!d?.over || d.over === d.id) return
    const rest = sections.find((s) => s.type === d.section)!.entries.map((e) => e.itemId).filter((x) => x !== d.id)
    moveEntry(d.section, d.id, rest.indexOf(d.over) + (d.after ? 1 : 0))
  }

  function drop() {
    if (!drag?.over || drag.over === drag.type) return setDrag(null)
    const rest = sections.map((s) => s.type).filter((t) => t !== drag.type)
    move(drag.type, rest.indexOf(drag.over) + (drag.after ? 1 : 0))
    setDrag(null)
  }

  const allBullets = data.sections.flatMap((s) => s.entries.flatMap((e) => e.bullets.map((b) => b.text)))
  const questions = [...data.sections.flatMap((s) => s.entries.flatMap((e) => e.questions)), ...data.otherQuestions]
  // Everything that asks for the person's attention lives in one tab: questions and check results.
  const improveCount = questions.length + (checks?.results.filter((r) => r.status === "fail" || r.status === "warn").length ?? 0)

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
      toast.success("Downloaded. This exact file is kept on your Dashboard, so you'll always know what you sent.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed")
    } finally {
      setDownloading(false)
    }
  }


  // From a check to the entry or line it's about: switch to editing, scroll there, flash it.
  function show(target: CheckTarget) {
    setMode("edit")
    setPane("editor")
    requestAnimationFrame(() => {
      const el = document.getElementById(target.bulletId ? `line-${target.bulletId}` : `entry-${target.itemId}`) ?? document.getElementById(`entry-${target.itemId}`)
      if (!el) return void toast("That entry isn't on the page right now.")
      el.scrollIntoView({ behavior: "smooth", block: "center" })
      el.classList.add("ring-2", "ring-amber-400/70")
      setTimeout(() => el.classList.remove("ring-2", "ring-amber-400/70"), 1800)
    })
  }

  function duplicate() {
    startTransition(async () => {
      const res = await duplicateResume(data.resumeId)
      if (!res.ok) return void toast.error(res.error)
      toast.success("Copied. You're now editing the copy.")
      router.push(`/resume/${res.data.resumeId}`)
    })
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
    <div className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {tailored ? (
            <button type="button" onClick={() => setRenaming(true)} className="group/title flex min-w-0 items-center gap-1.5 text-left" title="Rename">
              <h2 className="min-w-0 text-lg font-medium break-words">{data.title}</h2>
              <Pencil className="size-3.5 shrink-0 text-muted-foreground opacity-60 group-hover/title:opacity-100" />
              <span className="sr-only">Rename</span>
            </button>
          ) : (
            <h2 className="text-lg font-medium">{data.title}</h2>
          )}
          {data.archived && <Badge variant="outline" className="rounded-full font-normal text-muted-foreground">Archived</Badge>}
          {pending && <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Spinner /> Saving…</span>}
        </div>
        <div className="flex items-center gap-2">
          <DesignMenu doc={data.doc} pending={pending} onPick={(t) => run(() => setTemplate(data.resumeId, t))} />
          <Button onClick={download} disabled={downloading || pending}>
            {downloading ? <Spinner /> : <Download />} Download PDF
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="More"><MoreHorizontal /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild><a href={`/api/tex/${data.resumeId}`} title="Same content as the PDF in a standard LaTeX template. Fonts and spacing differ slightly; it's checked to fit on one page when the PDF does.">Download .tex</a></DropdownMenuItem>
              <DropdownMenuItem onSelect={openInOverleaf}>Open in Overleaf</DropdownMenuItem>
              <DropdownMenuSeparator />
              {tailored && <DropdownMenuItem onSelect={() => setRenaming(true)}><Pencil /> Rename</DropdownMenuItem>}
              <DropdownMenuItem disabled={pending} onSelect={duplicate}><Copy /> Duplicate</DropdownMenuItem>
              {tailored && (
                <DropdownMenuItem onSelect={() => run(() => archiveResume(data.resumeId, !data.archived), () => toast.success(data.archived ? "Moved back to your resumes." : "Archived. Find it under Archived on the Resumes page."))}>
                  <Archive /> {data.archived ? "Unarchive" : "Archive"}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(true)}><Trash2 /> Delete resume</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div role="group" aria-label="Show the editor or the page" className="grid grid-cols-2 rounded-full border border-border p-0.5 text-sm lg:hidden">
        {(["editor", "page"] as const).map((p) => (
          <button key={p} type="button" aria-pressed={pane === p} onClick={() => setPane(p)} className={`rounded-full px-3 py-1.5 transition-colors ${pane === p ? "bg-foreground text-background" : "text-muted-foreground"}`}>
            {p === "editor" ? (mode === "chat" ? "Ask AI" : "Edit") : improveCount ? `Page · ${improveCount} to improve` : "Page"}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className={`min-w-0 space-y-4 ${pane === "page" ? "max-lg:hidden" : ""} ${mode === "chat" ? "lg:sticky lg:top-20 lg:self-start" : ""}`}>
        <div role="group" aria-label="Edit or ask AI" className="inline-flex rounded-full border border-border p-0.5 text-xs">
          {(["edit", "chat"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 transition-colors ${mode === m ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
            >
              {m === "edit" ? <Pencil className="size-3" /> : <MessageSquare className="size-3" />}
              {m === "edit" ? "Edit" : "Ask AI"}
            </button>
          ))}
        </div>
        <div className={mode === "chat" ? "" : "hidden"}>
          <ResumeChat resumeId={data.resumeId} initial={data.chat} onBusy={setChatBusy} />
        </div>
        {/* Editor */}
        <div className={mode === "edit" ? "space-y-6" : "hidden"}>
          <HeaderCard resumeId={data.resumeId} header={data.header} pending={pending} run={run} />

          {sections.map((section, si) => {
            const target = drag && drag.over === section.type && drag.type !== section.type
            return (
              <section
                key={section.type}
                className={`relative space-y-3 rounded-xl transition-opacity ${drag?.type === section.type ? "opacity-40" : ""}`}
                onDragOver={(e) => {
                  if (!drag) return
                  e.preventDefault()
                  const box = e.currentTarget.getBoundingClientRect()
                  const after = e.clientY > box.top + box.height / 2
                  if (drag.over !== section.type || drag.after !== after) setDrag({ ...drag, over: section.type, after })
                }}
                onDrop={(e) => { e.preventDefault(); drop() }}
              >
                {target && <div className={`pointer-events-none absolute inset-x-0 h-0.5 rounded-full bg-primary ${drag.after ? "-bottom-3" : "-top-3"}`} />}
                <div className="group/section flex h-8 min-w-0 items-center justify-between gap-2">
                  <div
                    draggable={!pending}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move"
                      e.dataTransfer.setData("text/plain", section.type)
                      setDrag({ type: section.type, over: null, after: false })
                    }}
                    onDragEnd={() => setDrag(null)}
                    className="flex min-w-0 cursor-grab md:-ml-5 items-center gap-1 rounded-md py-1 pr-2 text-muted-foreground active:cursor-grabbing"
                    title="Drag to reorder sections"
                  >
                    <GripVertical className="size-3.5 transition-opacity md:opacity-0 md:group-hover/section:opacity-100" />
                    <h2 className="text-xs font-medium tracking-wider uppercase">{section.title}</h2>
                  </div>
                  <div className="flex shrink-0 transition-opacity md:opacity-0 md:group-hover/section:opacity-100 md:focus-within:opacity-100">
                    <IconButton label="Move section up" disabled={pending || si === 0} onClick={() => move(section.type, si - 1)}><ArrowUp /></IconButton>
                    <IconButton label="Move section down" disabled={pending || si === sections.length - 1} onClick={() => move(section.type, si + 1)}><ArrowDown /></IconButton>
                  </div>
                </div>
                {section.entries.map((entry, ei) => {
                  const dragging = entryDrag?.id === entry.itemId
                  const over = entryDrag && entryDrag.section === section.type && entryDrag.over === entry.itemId && !dragging
                  return (
                    <div
                      key={entry.itemId}
                      className={`relative transition-opacity ${dragging ? "opacity-40" : ""}`}
                      onDragOver={(e) => {
                        if (!entryDrag || entryDrag.section !== section.type) return
                        e.preventDefault()
                        e.stopPropagation()
                        const box = e.currentTarget.getBoundingClientRect()
                        const after = e.clientY > box.top + box.height / 2
                        if (entryDrag.over !== entry.itemId || entryDrag.after !== after) setEntryDrag({ ...entryDrag, over: entry.itemId, after })
                      }}
                      onDrop={(e) => {
                        if (!entryDrag) return
                        e.preventDefault()
                        e.stopPropagation()
                        dropEntry()
                      }}
                    >
                      {over && <div className={`pointer-events-none absolute inset-x-2 z-10 h-0.5 rounded-full bg-primary ${entryDrag.after ? "-bottom-[7px]" : "-top-[7px]"}`} />}
                      <EntryCard
                        resumeId={data.resumeId}
                        type={section.type}
                        entry={entry}
                        position={{ first: ei === 0, last: ei === section.entries.length - 1 }}
                        allBullets={allBullets}
                        pending={pending}
                        run={run}
                        onMove={(to) => moveEntry(section.type, entry.itemId, to === "up" ? ei - 1 : ei + 1)}
                        handle={
                          section.entries.length > 1
                            ? {
                                draggable: !pending,
                                onDragStart: (e: React.DragEvent) => {
                                  e.stopPropagation()
                                  e.dataTransfer.effectAllowed = "move"
                                  e.dataTransfer.setData("text/plain", entry.itemId)
                                  setEntryDrag({ section: section.type, id: entry.itemId, over: null, after: false })
                                },
                                onDragEnd: () => setEntryDrag(null),
                              }
                            : null
                        }
                      />
                    </div>
                  )
                })}
              </section>
            )
          })}

          <p className="text-sm text-muted-foreground">
            Hidden items and everything else we found are in your <Link href="/record" className="underline underline-offset-4">Career Record</Link>.
          </p>
        </div>
        </div>

        {/* Preview + checks */}
        <div id="resume-panel" className={`min-w-0 scroll-mt-20 lg:sticky lg:top-20 lg:self-start ${pane === "editor" ? "max-lg:hidden" : ""}`}>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="improve">Improve{improveCount > 0 && <span className="ml-1 rounded-full bg-amber-400/15 px-1.5 text-[11px] text-amber-400">{improveCount}</span>}</TabsTrigger>
              {data.match && <TabsTrigger value="match">Job match</TabsTrigger>}
            </TabsList>
            <TabsContent value="preview">
              <div className="relative">
                <iframe
                  key={data.version}
                  title="Resume preview"
                  src={`/api/pdf/${data.resumeId}?v=${encodeURIComponent(data.version)}#toolbar=0&view=FitH`}
                  className="aspect-[8.5/11] w-full rounded-xl border border-border bg-white"
                />
                {(pending || chatBusy) && (
                  <div className="absolute inset-0 flex items-start justify-center rounded-xl bg-background/40 pt-6 backdrop-blur-[1px]">
                    <span className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs"><Spinner /> Updating the page…</span>
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="improve" className="space-y-6">
              {questions.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Questions that make your lines stronger</h3>
                  {questions.map((q) => <QuestionCard key={q.id} resumeId={data.resumeId} question={q} showItem />)}
                </section>
              )}
              {data.cuts.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Moved off the page to fit</h3>
                  {data.cuts.map((c, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 rounded-lg border border-dashed border-border p-3 text-sm">
                      <div className="min-w-0">
                        <div className="font-medium">{c.title}</div>
                        {c.bulletText && <div className="text-muted-foreground">“{c.bulletText}”</div>}
                        <div className="text-xs text-muted-foreground">{c.reason}</div>
                      </div>
                      <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => restoreCut(data.resumeId, c.itemId), () => toast.success("Restored and pinned. Something weaker made room."))}>
                        <RotateCcw /> Restore
                      </Button>
                    </div>
                  ))}
                </section>
              )}
              <ChecksPanel
                state={checks}
                onShow={show}
                busy={pending}
                onRemoveLine={(bulletId) =>
                  run(() => deleteBullet(data.resumeId, bulletId), (snapshot) =>
                    toast("Line removed", { description: "Its facts stay in your Career Record.", action: { label: "Undo", onClick: () => run(() => restoreBullet(data.resumeId, snapshot)) } })
                  )
                }
                onKeepLine={(itemId, bulletId) => run(() => keepLine(data.resumeId, itemId, bulletId), () => toast.success("Kept as it is."))}
              />
            </TabsContent>
            {data.match && (
              <TabsContent value="match">
                <div className="rounded-xl border border-border bg-card p-4">
                  <MatchReport
                    match={data.match}
                    titles={new Map(Object.entries(data.titles))}
                    page={data.page}
                    onShow={show}
                    onAdd={(itemId) => run(() => setItemState(data.resumeId, itemId, { status: "shown" }), () => toast.success(`Added ${data.titles[itemId] ?? "it"}. The page was re-fitted, so something weaker may have moved off.`))}
                    onRecheck={() => run(() => recheckMatch(data.resumeId), () => toast.success("Re-checked against the job post."))}
                    rechecking={pending}
                  />
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>

      <RenameDialog open={renaming} onOpenChange={setRenaming} title={data.title} pending={pending} onSave={(title) => run(() => renameResume(data.resumeId, title), () => setRenaming(false))} />
      <DeleteResumeDialog resume={{ id: data.resumeId, title: data.title, kind: data.kind }} open={deleting} onOpenChange={setDeleting} onDeleted={() => router.push("/resume")} />
    </div>
  )
}

// Your own resume in every design, side by side. A pick re-fits the page in that design.
function DesignMenu({ doc, pending, onPick }: { doc: ResumeDoc; pending: boolean; onPick: (template: TemplateId) => void }) {
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<{ from: TemplateId; to: TemplateId } | null>(null)
  // Shows the new pick right away; the saved design takes over once the page is refreshed.
  const current = picked?.from === doc.template ? picked.to : doc.template
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline"><Palette /> {TEMPLATES.find((t) => t.id === current)?.name}</Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] p-3">
        <div role="radiogroup" aria-label="Design" className="grid grid-cols-2 gap-2">
          {TEMPLATES.map((t) => {
            const on = current === t.id
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={pending}
                title={t.blurb}
                onClick={() => { setOpen(false); if (on) return; setPicked({ from: doc.template, to: t.id }); onPick(t.id) }}
                className={`group/design min-w-0 rounded-lg border p-1.5 text-left transition-colors disabled:cursor-wait ${on ? "border-foreground bg-muted" : "border-border hover:border-muted-foreground/60 hover:bg-muted/50"}`}
              >
                <FluidThumbnail doc={doc} template={t.id} />
                <div className={`mt-1.5 truncate text-xs ${on ? "font-medium text-foreground" : "text-muted-foreground group-hover/design:text-foreground"}`}>{t.name}</div>
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function FluidThumbnail({ doc, template }: { doc: ResumeDoc; template: TemplateId }) {
  const [width, setWidth] = useState(0)
  const ref = useRef<ResizeObserver | null>(null)
  const measure = useCallback((el: HTMLDivElement | null) => {
    ref.current?.disconnect()
    if (!el) return
    ref.current = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)))
    ref.current.observe(el)
  }, [])
  return (
    <div ref={measure} className="aspect-[8.5/11] overflow-hidden rounded-sm border border-border/60 bg-white">
      {width > 0 && <ResumeThumbnail doc={doc} template={template} width={width} />}
    </div>
  )
}

function RenameDialog({ open, onOpenChange, title, pending, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; pending: boolean; onSave: (title: string) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename resume</DialogTitle>
          <DialogDescription>Only you see this name. The PDF file is named from it.</DialogDescription>
        </DialogHeader>
        <form action={(form) => onSave(String(form.get("title") ?? ""))} className="space-y-3">
          <Field name="title" label="Name" value={title} />
          <DialogFooter>
            <Button type="submit" disabled={pending}>{pending && <Spinner />} Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function HeaderCard({ resumeId, header, pending, run }: { resumeId: string; header: EditorData["header"]; pending: boolean; run: Run }) {
  const [open, setOpen] = useState(false)
  const contact = [header.email, header.phone, header.location, ...[header.linkedin, header.github, header.website].filter(Boolean).map(displayUrl)].filter(Boolean)
  const missing = [!header.name && "your name", !header.email && "an email", !(header.github || header.linkedin || header.website) && "a link"].filter(Boolean)

  function submit(form: FormData) {
    const get = (k: string) => String(form.get(k) ?? "").trim()
    const input = Object.fromEntries(["name", "headline", "target_role", "email", "phone", "location", "website", "github", "linkedin"].map((k) => [k, get(k)]))
    run(() => updateHeader(resumeId, input), () => setOpen(false))
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold">{header.name || <span className="text-muted-foreground">Your name</span>}</div>
          {header.headline && <div className="text-sm">{header.headline}</div>}
          <div className="mt-1 text-sm break-words text-muted-foreground [overflow-wrap:anywhere]">{contact.join(" · ") || "No contact details yet"}</div>
          {header.targetRole && <div className="mt-2 text-xs text-muted-foreground">Aimed at: <span className="text-foreground">{header.targetRole}</span></div>}
          {missing.length > 0 && <div className="mt-2 text-xs text-amber-400">Add {missing.join(", ")} so recruiters can reach you.</div>}
        </div>
        <Button size="sm" variant={missing.length ? "secondary" : "ghost"} className={`shrink-0 ${missing.length ? "" : "text-muted-foreground"}`} disabled={pending} onClick={() => setOpen(true)}><Pencil /> Edit</Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Header and contact</DialogTitle>
            <DialogDescription>Shown at the top of the page. Links like github.com/you work as typed.</DialogDescription>
          </DialogHeader>
          <form action={submit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field name="name" label="Name" value={header.name} />
              <Field name="headline" label="Headline" value={header.headline} placeholder="Software Developer" />
              <Field name="email" label="Email" value={header.email} type="email" />
              <Field name="phone" label="Phone" value={header.phone} />
              <Field name="location" label="Location" value={header.location} placeholder="City, Country" />
              <Field name="github" label="GitHub" value={header.github} placeholder="github.com/you" />
              <Field name="linkedin" label="LinkedIn" value={header.linkedin} placeholder="linkedin.com/in/you" />
              <Field name="website" label="Website" value={header.website} />
            </div>
            <Field name="target_role" label="Applying for (optional)" value={header.targetRole} placeholder="e.g. Frontend engineer" hint="Rewrites lead with what matters for this role." />
            <DialogFooter>
              <Button type="submit" disabled={pending}>{pending && <Spinner />} Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const DETAIL_FIELDS: Record<string, { key: keyof Details; label: string; placeholder?: string; wide?: boolean }[]> = {
  job: [{ key: "role", label: "Title" }, { key: "company", label: "Company" }, { key: "location", label: "Location" }, { key: "start", label: "Start", placeholder: "Jun 2024" }, { key: "end", label: "End", placeholder: "Present" }],
  project: [{ key: "name", label: "Name" }, { key: "url", label: "Link" }, { key: "tech", label: "Tech (comma separated)", wide: true }, { key: "start", label: "Start" }, { key: "end", label: "End" }],
  award: [{ key: "name", label: "Name" }, { key: "url", label: "Link" }, { key: "start", label: "Date" }],
  education: [{ key: "school", label: "School" }, { key: "degree", label: "Degree" }, { key: "details", label: "Details", placeholder: "GPA, honors, relevant coursework", wide: true }, { key: "location", label: "Location" }, { key: "start", label: "Start" }, { key: "end", label: "End", placeholder: "May 2026" }],
  skills: [{ key: "category", label: "Group name" }, { key: "skills", label: "Skills (comma separated)", wide: true }],
}

function EntryCard({ resumeId, type, entry, position, allBullets, pending, run, onMove, handle }: {
  resumeId: string
  type: string
  entry: Entry
  position: { first: boolean; last: boolean }
  allBullets: string[]
  pending: boolean
  run: Run
  onMove: (direction: "up" | "down") => void
  handle: { draggable: boolean; onDragStart: (e: React.DragEvent) => void; onDragEnd: () => void } | null
}) {
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const writable = type === "job" || type === "project" || type === "award"

  function saveDetails(form: FormData) {
    const input: Record<string, string | string[]> = {}
    for (const f of DETAIL_FIELDS[type] ?? []) {
      const v = String(form.get(f.key) ?? "").trim()
      input[f.key] = f.key === "tech" || f.key === "skills" ? v.split(/\s*,\s*/).filter(Boolean) : v
    }
    run(() => updateItemDetails(resumeId, entry.itemId, input), () => setEditing(false))
  }

  function hide() {
    run(() => setItemState(resumeId, entry.itemId, { status: "hidden" }), () =>
      toast(`Hid “${entry.title}”`, { description: "It stays in your Career Record.", action: { label: "Undo", onClick: () => run(() => setItemState(resumeId, entry.itemId, { status: "shown" })) } })
    )
  }

  return (
    <div id={`entry-${entry.itemId}`} className="group/entry relative scroll-mt-24 rounded-xl border border-border bg-card p-4 transition hover:border-foreground/15">
      {handle && (
        <div
          {...handle}
          title="Drag to reorder"
          className="absolute top-0 bottom-0 left-0 flex w-4 cursor-grab items-center justify-center rounded-l-xl text-muted-foreground transition-opacity active:cursor-grabbing md:opacity-0 md:group-hover/entry:opacity-100"
        >
          <GripVertical className="size-3.5" />
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <button type="button" className="min-w-0 text-left" onClick={() => setEditing(true)} title="Edit title, dates and links">
          <div className="font-medium break-words">{entry.title}</div>
          {entry.subtitle && <div className="truncate text-sm text-muted-foreground">{entry.subtitle}</div>}
        </button>
        <div className="flex shrink-0 items-center">
          {entry.pinned && (
            <IconButton label="Pinned: never cut to fit. Click to unpin." disabled={pending} onClick={() => run(() => setItemState(resumeId, entry.itemId, { pinned: false }))}>
              <Pin className="fill-current text-foreground" />
            </IconButton>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="size-8 text-muted-foreground transition-opacity md:opacity-0 md:group-hover/entry:opacity-100 data-[state=open]:opacity-100 md:focus-visible:opacity-100" disabled={pending} aria-label={`Actions for ${entry.title}`}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {writable && entry.bullets.length > 0 && (
                <>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger><Wand2 /> Rewrite lines</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {(Object.keys(REWRITE_LABELS) as RewriteStyle[]).map((style) => (
                        <DropdownMenuItem key={style} onSelect={() => run(() => regenerateItem(resumeId, entry.itemId, style), () => toast.success("Rewritten. Numbers and claims still come only from your facts."))}>
                          {REWRITE_LABELS[style]}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onSelect={() => setEditing(true)}><Pencil /> Edit details</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => run(() => setItemState(resumeId, entry.itemId, { pinned: !entry.pinned }))}>
                {entry.pinned ? <><PinOff /> Unpin</> : <><Pin /> Pin (never cut)</>}
              </DropdownMenuItem>
              {handle && (
                <>
                  <DropdownMenuItem disabled={position.first} onSelect={() => onMove("up")}><ArrowUp /> Move up</DropdownMenuItem>
                  <DropdownMenuItem disabled={position.last} onSelect={() => onMove("down")}><ArrowDown /> Move down</DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={hide}><EyeOff /> Hide from resume</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {entry.bullets.length > 0 && (
        <ul className="mt-3 space-y-2.5">
          {entry.bullets.map((b) => (
            <BulletRow
              key={b.id}
              bullet={b}
              hint={bulletHint(b.text, allBullets.filter((t) => t !== b.text))}
              disabled={pending}
              onSave={(text) => run(() => editBullet(resumeId, b.id, text))}
              onDelete={() =>
                run(() => deleteBullet(resumeId, b.id), (snapshot) =>
                  toast("Line removed", { description: "Its facts stay in your Career Record.", action: { label: "Undo", onClick: () => run(() => restoreBullet(resumeId, snapshot)) } })
                )
              }
            />
          ))}
        </ul>
      )}

      {writable &&
        (adding ? (
          <BulletInput
            initial=""
            disabled={pending}
            placeholder="What did you build or change, with what, and what happened?"
            onCancel={() => setAdding(false)}
            onSave={(text) => run(() => addBullet(resumeId, entry.itemId, text), () => setAdding(false))}
          />
        ) : (
          <Button size="sm" variant="ghost" className="mt-1.5 -mb-1.5 -ml-2 h-7 px-2 text-xs text-muted-foreground transition-opacity md:opacity-0 md:group-hover/entry:opacity-100 md:focus-visible:opacity-100" disabled={pending} onClick={() => setAdding(true)}>
            <Plus /> Add a line
          </Button>
        ))}


      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit {entry.title}</DialogTitle>
            <DialogDescription>{type === "job" || type === "education" ? "Sorted newest first by these dates unless you drag it somewhere else." : "Saved as “You told us”."}</DialogDescription>
          </DialogHeader>
          <form action={saveDetails} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {(DETAIL_FIELDS[type] ?? []).map((f) => (
                <div key={f.key} className={f.wide ? "sm:col-span-2" : undefined}>
                  <Field name={f.key} label={f.label} value={entry.details[f.key]} placeholder={f.placeholder} />
                </div>
              ))}
            </div>
            {entry.reason && <p className="text-xs text-muted-foreground">Why it&apos;s here: {entry.reason}</p>}
            <DialogFooter>
              <Button type="submit" disabled={pending}>{pending && <Spinner />} Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ name, label, value, placeholder, type = "text", hint }: { name: string; label: string; value: string; placeholder?: string; type?: string; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={value} placeholder={placeholder} autoComplete="off" />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="icon" variant="ghost" className="size-8 text-muted-foreground" onClick={onClick} disabled={disabled} aria-label={label}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function BulletInput({ initial, disabled, placeholder, onSave, onCancel }: { initial: string; disabled: boolean; placeholder?: string; onSave: (text: string) => void; onCancel: () => void }) {
  const [text, setText] = useState(initial)
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const save = () => text.trim() && onSave(text.trim())
  return (
    <div className="mt-2 space-y-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        autoFocus
        placeholder={placeholder}
        aria-label={initial ? "Edit this line" : "New line"}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save() }
          if (e.key === "Escape") onCancel()
        }}
      />
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={disabled || !text.trim()} onClick={save}>Save</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        <span className={`ml-auto text-xs ${words > 22 ? "text-amber-400" : "text-muted-foreground"}`}>{words} words · Enter to save</span>
      </div>
    </div>
  )
}

function BulletRow({ bullet, hint, disabled, onSave, onDelete }: {
  bullet: Entry["bullets"][number]
  hint: ReturnType<typeof bulletHint>
  disabled: boolean
  onSave: (text: string) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [sources, setSources] = useState(false)

  if (editing) {
    return (
      <li>
        <BulletInput initial={bullet.text} disabled={disabled} onCancel={() => setEditing(false)} onSave={(text) => { if (text !== bullet.text) onSave(text); setEditing(false) }} />
      </li>
    )
  }

  const extras = bullet.facts.length > 0 || bullet.userEdited || bullet.ownCopy
  return (
    <li id={`line-${bullet.id}`} className="group -mx-1 flex gap-2 rounded-md px-1 text-sm leading-relaxed transition">
      <span className="mt-[0.55em] size-1 shrink-0 rounded-full bg-muted-foreground" />
      <div className="min-w-0 flex-1">
        <button type="button" className="text-left break-words hover:text-foreground/80" onClick={() => setEditing(true)} title="Click to edit">
          {bullet.text}
        </button>
        {sources && (
          <span className="mt-1 flex flex-wrap items-center gap-1">
            {bullet.facts.map((f) => <FactChip key={f.id} fact={f} />)}
            {bullet.userEdited && <Badge variant="outline" className="text-[10px]">edited by you</Badge>}
            {bullet.ownCopy && <Badge variant="outline" className="text-[10px]">this resume only</Badge>}
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-start">
        {hint && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" onClick={() => setEditing(true)} aria-label={hint.kind === "no_result" ? "Add a result?" : "Polish"} className="mt-0.5 size-6 rounded-md text-amber-400 hover:bg-amber-400/10 [&_svg]:mx-auto [&_svg]:size-3.5">
                <Lightbulb />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-64">{hint.text}</TooltipContent>
          </Tooltip>
        )}
        {extras && (
          <button
            type="button"
            onClick={() => setSources(!sources)}
            aria-pressed={sources}
            aria-label="Where this line comes from"
            title="Where this line comes from"
            className={`mt-0.5 size-6 rounded-md text-muted-foreground transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 [&_svg]:mx-auto [&_svg]:size-3.5 ${sources ? "" : "md:opacity-0 md:group-hover:opacity-100"}`}
          >
            <FileCheck />
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled}
          aria-label="Remove this line"
          className="mt-0.5 size-6 rounded-md text-muted-foreground transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 disabled:pointer-events-none md:opacity-0 md:group-hover:opacity-100 [&_svg]:mx-auto [&_svg]:size-3.5"
        >
          <Trash2 />
        </button>
      </div>
    </li>
  )
}

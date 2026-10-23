"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { ArrowDown, ArrowUp, ChevronDown, Download, EyeOff, Lightbulb, Pencil, Pin, PinOff, Plus, RotateCcw, Sparkles, Trash2, Wand2 } from "lucide-react"
import { toast } from "sonner"
import { ChecksPanel, ReadinessBadge, useResumeChecks } from "@/components/app/checks-panel"
import { FactChip, type FactView } from "@/components/app/fact-chip"
import { QuestionCard, type QuestionView } from "@/components/app/questions-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  addBullet, deleteBullet, editBullet, moveItem, moveSection, regenerateItem, restoreBullet, restoreCut, setItemState, updateHeader, updateItemDetails, type ActionResult,
} from "@/lib/record/actions"
import { REWRITE_LABELS, type RewriteStyle } from "@/lib/record/rewrite-styles"
import type { ItemType } from "@/lib/record/types"
import { bulletHint } from "@/lib/resume/hints"
import { OVERLEAF_URL } from "@/lib/resume/latex"

type Details = Record<"role" | "company" | "name" | "url" | "school" | "degree" | "details" | "category" | "location" | "start" | "end" | "tech" | "skills", string>

export interface EditorData {
  resumeId: string
  title: string
  version: string
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
      bullets: { id: string; text: string; userEdited: boolean; facts: FactView[] }[]
    }[]
  }[]
  cuts: { itemId: string; bulletText: string | null; title: string; reason: string }[]
  otherQuestions: QuestionView[]
}

type Entry = EditorData["sections"][number]["entries"][number]
type Run = <T>(action: () => Promise<ActionResult<T>>, after?: (data: T) => void) => void

export function ResumeEditor({ data }: { data: EditorData }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [downloading, setDownloading] = useState(false)
  const [tab, setTab] = useState("preview")
  const checks = useResumeChecks(data.resumeId, data.version)

  const run: Run = (action, after) => {
    startTransition(async () => {
      const res = await action()
      if (!res.ok) return void toast.error(res.error)
      after?.(res.data)
      router.refresh()
    })
  }

  const allBullets = data.sections.flatMap((s) => s.entries.flatMap((e) => e.bullets.map((b) => b.text)))
  const questions = [...data.sections.flatMap((s) => s.entries.flatMap((e) => e.questions)), ...data.otherQuestions]
  const hinted = allBullets.filter((t, i) => bulletHint(t, allBullets.filter((_, j) => j !== i))).length

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
          <ReadinessBadge state={checks} onClick={() => setTab("checks")} />
          {pending && <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Spinner /> Saving…</span>}
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
              <DropdownMenuItem asChild><Link href="/start">Add sources and update</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><a href="/api/data">Download my data (JSON)</a></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {(questions.length > 0 || hinted > 0) && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm">
          <Sparkles className="size-4 shrink-0 text-primary" />
          <p className="min-w-0 flex-1">
            <span className="font-medium">Make it stronger. </span>
            <span className="text-muted-foreground">
              {[
                questions.length && `${questions.length} quick answer${questions.length === 1 ? "" : "s"} (numbers we can't guess)`,
                hinted && `${hinted} line${hinted === 1 ? "" : "s"} to polish (look for the bulb)`,
              ].filter(Boolean).join(" · ")}
            </span>
          </p>
          {questions.length > 0 && (
            <Button size="sm" variant="secondary" onClick={() => document.getElementById(`q-${questions[0].id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}>
              Answer the first one
            </Button>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Editor */}
        <div className="space-y-6">
          <HeaderCard resumeId={data.resumeId} header={data.header} pending={pending} run={run} />

          {data.sections.map((section, si) => (
            <section key={section.type} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-medium tracking-wider text-muted-foreground uppercase">{section.title}</h2>
                <div className="flex">
                  <IconButton label="Move section up" disabled={pending || si === 0} onClick={() => run(() => moveSection(data.resumeId, section.type, "up"))}><ArrowUp /></IconButton>
                  <IconButton label="Move section down" disabled={pending || si === data.sections.length - 1} onClick={() => run(() => moveSection(data.resumeId, section.type, "down"))}><ArrowDown /></IconButton>
                </div>
              </div>
              {section.entries.map((entry, ei) => (
                <EntryCard
                  key={entry.itemId}
                  resumeId={data.resumeId}
                  type={section.type}
                  entry={entry}
                  position={{ first: ei === 0, last: ei === section.entries.length - 1 }}
                  allBullets={allBullets}
                  pending={pending}
                  run={run}
                />
              ))}
            </section>
          ))}

          {data.otherQuestions.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-medium tracking-wider text-muted-foreground uppercase">About items not on the page</h2>
              {data.otherQuestions.map((q) => <QuestionCard key={q.id} resumeId={data.resumeId} question={q} showItem />)}
            </section>
          )}

          {data.cuts.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Moved off the page to fit</h2>
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
          <p className="text-sm text-muted-foreground">
            Hidden items and everything else we found are in your <Link href="/record" className="underline underline-offset-4">Career Record</Link>.
          </p>
        </div>

        {/* Preview + checks */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="checks">Checks</TabsTrigger>
            </TabsList>
            <TabsContent value="preview">
              <div className="relative">
                <iframe
                  key={data.version}
                  title="Resume preview"
                  src={`/api/pdf/${data.resumeId}?v=${encodeURIComponent(data.version)}#toolbar=0&view=FitH`}
                  className="aspect-[8.5/11] w-full rounded-xl border border-border bg-white"
                />
                {pending && (
                  <div className="absolute inset-0 flex items-start justify-center rounded-xl bg-background/40 pt-6 backdrop-blur-[1px]">
                    <span className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs"><Spinner /> Updating the page…</span>
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="checks">
              <ChecksPanel state={checks} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

function HeaderCard({ resumeId, header, pending, run }: { resumeId: string; header: EditorData["header"]; pending: boolean; run: Run }) {
  const [open, setOpen] = useState(false)
  const contact = [header.email, header.phone, header.location, header.linkedin, header.github, header.website].filter(Boolean)
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
          <div className="mt-1 truncate text-sm text-muted-foreground">{contact.join(" · ") || "No contact details yet"}</div>
          {header.targetRole && <div className="mt-2 text-xs text-muted-foreground">Aimed at: <span className="text-foreground">{header.targetRole}</span></div>}
          {missing.length > 0 && <div className="mt-2 text-xs text-amber-400">Add {missing.join(", ")} so recruiters can reach you.</div>}
        </div>
        <Button size="sm" variant={missing.length ? "secondary" : "ghost"} disabled={pending} onClick={() => setOpen(true)}><Pencil /> Edit</Button>
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

function EntryCard({ resumeId, type, entry, position, allBullets, pending, run }: {
  resumeId: string
  type: string
  entry: Entry
  position: { first: boolean; last: boolean }
  allBullets: string[]
  pending: boolean
  run: Run
}) {
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const movable = type === "project" || type === "award" || type === "skills"
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
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <button type="button" className="min-w-0 text-left" onClick={() => setEditing(true)} title="Edit title, dates and links">
          <div className="font-medium">{entry.title}</div>
          {entry.subtitle && <div className="truncate text-sm text-muted-foreground">{entry.subtitle}</div>}
        </button>
        <div className="flex shrink-0 items-center gap-0.5">
          {movable && (
            <>
              <IconButton label="Move up" disabled={pending || position.first} onClick={() => run(() => moveItem(resumeId, entry.itemId, "up"))}><ArrowUp /></IconButton>
              <IconButton label="Move down" disabled={pending || position.last} onClick={() => run(() => moveItem(resumeId, entry.itemId, "down"))}><ArrowDown /></IconButton>
            </>
          )}
          <IconButton label={entry.pinned ? "Unpin" : "Pin (never cut to fit)"} disabled={pending} onClick={() => run(() => setItemState(resumeId, entry.itemId, { pinned: !entry.pinned }))}>
            {entry.pinned ? <PinOff /> : <Pin />}
          </IconButton>
          {writable && entry.bullets.length > 0 && (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="size-8 text-muted-foreground" disabled={pending} aria-label="Rewrite bullets"><Wand2 /></Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Rewrite bullets</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Rewrite from the same facts</DropdownMenuLabel>
                {(Object.keys(REWRITE_LABELS) as RewriteStyle[]).map((style) => (
                  <DropdownMenuItem key={style} onSelect={() => run(() => regenerateItem(resumeId, entry.itemId, style), () => toast.success("Rewritten. Numbers and claims still come only from your facts."))}>
                    {REWRITE_LABELS[style]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <IconButton label="Edit details" disabled={pending} onClick={() => setEditing(true)}><Pencil /></IconButton>
          <IconButton label="Hide from resume" disabled={pending} onClick={hide}><EyeOff /></IconButton>
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
          <Button size="sm" variant="ghost" className="mt-2 h-7 px-2 text-xs text-muted-foreground" disabled={pending} onClick={() => setAdding(true)}>
            <Plus /> Add a line
          </Button>
        ))}

      {entry.questions.length > 0 && (
        <div className="mt-3 space-y-2">
          {entry.questions.map((q) => <QuestionCard key={q.id} resumeId={resumeId} question={q} />)}
        </div>
      )}

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit {entry.title}</DialogTitle>
            <DialogDescription>{type === "job" || type === "education" ? "Jobs and schools are ordered newest first by these dates." : "Saved as “You told us”."}</DialogDescription>
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

  if (editing) {
    return (
      <li>
        <BulletInput initial={bullet.text} disabled={disabled} onCancel={() => setEditing(false)} onSave={(text) => { if (text !== bullet.text) onSave(text); setEditing(false) }} />
      </li>
    )
  }

  return (
    <li className="group flex gap-2 text-sm leading-relaxed">
      <span className="mt-[0.55em] size-1 shrink-0 rounded-full bg-muted-foreground" />
      <div className="min-w-0 flex-1">
        <button type="button" className="text-left hover:text-foreground/80" onClick={() => setEditing(true)} title="Click to edit">
          {bullet.text}
        </button>
        <span className="mt-1 flex flex-wrap items-center gap-1">
          {bullet.facts.map((f) => <FactChip key={f.id} fact={f} />)}
          {bullet.userEdited && <Badge variant="outline" className="text-[10px]">edited by you</Badge>}
          {hint && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1 rounded-md px-1 text-[11px] text-amber-400 hover:bg-amber-400/10">
                  <Lightbulb className="size-3" /> {hint.kind === "no_result" ? "Add a result?" : "Polish"}
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-64">{hint.text}</TooltipContent>
            </Tooltip>
          )}
        </span>
      </div>
      <button
        type="button"
        onClick={onDelete}
        disabled={disabled}
        aria-label="Remove this line"
        className="mt-0.5 size-6 shrink-0 rounded-md text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100 disabled:pointer-events-none [&_svg]:mx-auto [&_svg]:size-3.5"
      >
        <Trash2 />
      </button>
    </li>
  )
}

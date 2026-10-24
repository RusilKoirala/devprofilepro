"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react"
import { ArrowRight, CheckCircle2, CircleDashed, X, XCircle } from "lucide-react"
import { MatchReport } from "@/components/app/match-report"
import { NewResumePrompt } from "@/components/app/new-resume-prompt"
import { offerUpgrade } from "@/components/app/upgrade-prompt"
import { UpgradeDialog } from "@/components/app/upgrade-dialog"
import { allowanceStates, type PlanUsage } from "@/lib/plans"
import { EditList, forModel } from "@/components/app/resume-chat"
import { ResumeThumbnail } from "@/components/app/resume-thumbnail"
import { LogoMark } from "@/components/marketing/logo"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"
import { Spinner } from "@/components/ui/spinner"
import type { TailorPlan } from "@/lib/ai/tailor"
import { chatWithResume, resumeSummary, stageFit, stageTailorPlan, stageTailorSave, type ActionResult, type ChatEditResult } from "@/lib/record/actions"
import type { ResumeDoc } from "@/lib/resume/schema"

export interface ResumeCard {
  id: string
  title: string
  updated: string
  doc: ResumeDoc
}

type StepState = "pending" | "running" | "done" | "failed"
interface Step {
  label: string
  state: StepState
  detail?: string
}
// A turn either makes a new resume (staged steps) or edits the one just made (one chat call).
interface CreateTurn {
  kind: "create"
  id: number
  brief: string
  steps: Step[]
  result?: { resumeId: string; title: string; doc: ResumeDoc; plan: TailorPlan; fails: number; warns: number }
}
interface EditTurn {
  kind: "edit"
  id: number
  resumeId: string
  brief: string
  busy: boolean
  reply?: string
  edits?: ChatEditResult[]
  error?: boolean
}
type Turn = CreateTurn | EditTurn

const STEPS = ["Matching your Career Record to the request", "Building the resume", "Fitting it on one page", "Checking it"]

// /resume: a prompt to start a new resume, then a conversation-style timeline of what was done.
export function ResumeHome({ firstName, resumes, usage }: { firstName: string; resumes: ResumeCard[]; usage: PlanUsage }) {
  const router = useRouter()
  const { setOpen, isMobile, setOpenMobile } = useSidebar()
  const reduce = useReducedMotion()
  const [turns, setTurns] = useState<Turn[]>([])
  // The resume follow-up messages edit. Set when one is made; cleared to start another.
  const [active, setActive] = useState<{ resumeId: string; title: string } | null>(null)
  // Latest page for each resume made here, so result cards show the edits.
  const [docs, setDocs] = useState<Record<string, ResumeDoc>>({})
  const endRef = useRef<HTMLDivElement>(null)
  const chatting = turns.length > 0
  const busy = turns.some((t) => (t.kind === "create" ? t.steps.some((s) => s.state === "running") : t.busy))

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "end" })
  }, [turns, reduce])

  function patch(id: number, i: number, step: Partial<Step>, result?: CreateTurn["result"]) {
    setTurns((all) => all.map((t) => (t.id === id && t.kind === "create" ? { ...t, result: result ?? t.result, steps: t.steps.map((s, n) => (n === i ? { ...s, ...step } : s)) } : t)))
  }

  function run(text: string) {
    if (!chatting) {
      if (isMobile) setOpenMobile(false)
      else setOpen(false)
    }
    if (active) void edit(active.resumeId, text)
    else void create(text)
  }

  // Same harness as the chat inside a resume: one AI call, checked edits, one re-fit.
  async function edit(resumeId: string, brief: string) {
    const id = Date.now()
    const earlier = turns.filter((t): t is EditTurn => t.kind === "edit" && t.resumeId === resumeId && !t.error && !t.busy)
    const history = [
      ...earlier.flatMap((t) => [{ role: "user" as const, content: t.brief }, { role: "assistant" as const, content: forModel({ role: "assistant", content: t.reply ?? "", edits: t.edits }) }]),
      { role: "user" as const, content: brief },
    ]
    setTurns((all) => [...all, { kind: "edit", id, resumeId, brief, busy: true }])
    const res = await chatWithResume(resumeId, history).catch((): ActionResult<{ reply: string; edits: ChatEditResult[] }> => ({ ok: false, error: "We couldn't reach the server. Try again." }))
    const done = (p: Partial<EditTurn>) => setTurns((all) => all.map((t) => (t.id === id && t.kind === "edit" ? { ...t, busy: false, ...p } : t)))
    if (!res.ok) {
      offerUpgrade(res)
      return done({ reply: res.error, error: true })
    }
    done({ reply: res.data.reply, edits: res.data.edits })
    if (!res.data.edits.some((e) => e.ok)) return
    const summary = await resumeSummary(resumeId)
    if (summary.ok) setDocs((all) => ({ ...all, [resumeId]: summary.data.doc }))
    router.refresh()
  }

  async function create(brief: string) {
    const id = Date.now()
    setTurns((all) => [...all, { kind: "create", id, brief, steps: STEPS.map((label) => ({ label, state: "pending" })) }])

    async function step<T>(i: number, call: () => Promise<ActionResult<T>>, describe: (d: T) => string): Promise<T | null> {
      patch(id, i, { state: "running" })
      const res = await call().catch((): ActionResult<T> => ({ ok: false, error: "We couldn't reach the server. Check your connection and try again." }))
      if (!res.ok) {
        patch(id, i, { state: "failed", detail: res.error })
        offerUpgrade(res)
        return null
      }
      patch(id, i, { state: "done", detail: describe(res.data) })
      return res.data
    }

    const plan = await step(0, () => stageTailorPlan(brief), (p) => {
      const covered = p.requirements.filter((r) => r.status === "covered").length
      return `Picked ${p.items.length} item${p.items.length === 1 ? "" : "s"}${p.requirements.length ? ` · ${covered} of ${p.requirements.length} job requirements shown in your record` : ""}`
    })
    if (!plan) return
    const saved = await step(1, () => stageTailorSave(brief, plan), (d) => `Saved “${d.title}”. Your base resume is unchanged.`)
    if (!saved) return
    const fit = await step(2, () => stageFit(saved.resumeId), (d) => (d.pinnedOverflow ? "Pinned items don't fit on one page" : d.cuts ? `One page. Moved ${d.cuts} weaker line${d.cuts === 1 ? "" : "s"} off to fit` : "Fits on one page"))
    if (!fit) return
    const summary = await step(3, () => resumeSummary(saved.resumeId), (d) => (d.fails ? `${d.fails} to fix before sending` : d.warns ? `Checks passed, ${d.warns} to review` : "Checks passed"))
    if (!summary) return
    patch(id, 3, {}, { resumeId: saved.resumeId, title: saved.title, doc: summary.doc, plan, fails: summary.fails, warns: summary.warns })
    setActive({ resumeId: saved.resumeId, title: saved.title })
    router.refresh() // the sidebar's resume list
  }

  const fade = reduce ? {} : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.3, ease: "easeOut" as const } }
  const glide = reduce ? undefined : { type: "spring" as const, stiffness: 260, damping: 32 }

  return (
    <LayoutGroup>
      <div className={`mx-auto flex max-w-3xl flex-col ${chatting ? "min-h-[calc(100svh-6rem)]" : "items-center pt-[10vh]"}`}>
        <AnimatePresence mode="popLayout" initial={false}>
          {!chatting && (
            <motion.h2 key="greeting" {...fade} className="flex items-center gap-3 text-center text-2xl font-medium tracking-tight sm:text-3xl">
              <LogoMark className="size-7 shrink-0" />
              {firstName ? `Ready for a new resume, ${firstName}?` : "Ready for a new resume?"}
            </motion.h2>
          )}
        </AnimatePresence>

        {chatting && (
          <div className="flex-1 space-y-10 pt-2 pb-8">
            {turns.map((t) => (t.kind === "create" ? <TurnView key={t.id} turn={t} doc={t.result ? docs[t.result.resumeId] : undefined} reduce={!!reduce} /> : <EditTurnView key={t.id} turn={t} reduce={!!reduce} />))}
            <div ref={endRef} />
          </div>
        )}

        <motion.div
          layout="position"
          transition={glide}
          className={chatting ? "sticky bottom-0 z-10 -mx-2 bg-gradient-to-t from-background from-70% to-transparent px-2 pt-6 pb-4" : "mt-8 w-full"}
        >
          {active && (
            <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card py-1 pr-1 pl-3">
                Editing <span className="max-w-56 truncate text-foreground">{active.title}</span>
                <button type="button" onClick={() => setActive(null)} disabled={busy} aria-label="Stop editing this resume and make a new one" className="rounded-full p-0.5 hover:bg-muted hover:text-foreground">
                  <X className="size-3.5" />
                </button>
              </span>
              <Link href={`/resume/${active.resumeId}`} className="hover:text-foreground hover:underline">Open in editor</Link>
            </div>
          )}
          <NewResumePrompt
            onSubmit={run}
            busy={busy}
            suggestions={!chatting}
            placeholder={active ? `Ask for changes to “${active.title}”…` : chatting ? "Describe another resume to make…" : undefined}
          />
          {!active && <TailoredAllowance usage={usage} />}
        </motion.div>

        <AnimatePresence initial={false}>
          {!chatting && (
            <motion.section key="resumes" {...fade} className="mt-16 w-full">
              <h3 className="mb-4 text-xs font-medium tracking-wider text-muted-foreground uppercase">Your resumes</h3>
              <div className="grid grid-cols-[repeat(auto-fill,184px)] justify-center gap-6 sm:justify-start">
                {resumes.map((r) => <ResumeTile key={r.id} card={r} />)}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </LayoutGroup>
  )
}

function ResumeTile({ card }: { card: ResumeCard }) {
  return (
    <Link href={`/resume/${card.id}`} className="group">
      <div className="overflow-hidden rounded-lg border border-border shadow-sm ring-foreground/20 transition group-hover:-translate-y-0.5 group-hover:ring-2 group-focus-visible:ring-2">
        <ResumeThumbnail doc={card.doc} />
      </div>
      <p className="mt-2.5 truncate text-sm font-medium">{card.title}</p>
      <p className="text-xs text-muted-foreground">Updated {card.updated}</p>
    </Link>
  )
}

function UserBubble({ text, reduce }: { text: string; reduce: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const long = text.length > 320 || text.split("\n").length > 6
  return (
    <motion.div {...(reduce ? {} : { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25 } })} className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-muted px-4 py-2.5 text-sm leading-relaxed">
        <p className={`whitespace-pre-wrap ${long && !expanded ? "line-clamp-6" : ""}`}>{text}</p>
        {long && <button type="button" onClick={() => setExpanded((e) => !e)} className="mt-1 text-xs text-muted-foreground hover:text-foreground">{expanded ? "Show less" : "Show all"}</button>}
      </div>
    </motion.div>
  )
}

function EditTurnView({ turn, reduce }: { turn: EditTurn; reduce: boolean }) {
  return (
    <div className="space-y-5">
      <UserBubble text={turn.brief} reduce={reduce} />
      <motion.div {...(reduce ? {} : { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25 } })} className="flex gap-3">
        <LogoMark className="mt-0.5 size-6 shrink-0" />
        <div className="min-w-0 flex-1 space-y-2 text-sm leading-relaxed">
          {turn.busy ? (
            <p className="flex items-center gap-2 text-muted-foreground"><Spinner /> Reading the resume and making the changes…</p>
          ) : (
            <>
              <p className={turn.error ? "text-destructive" : undefined}>{turn.reply}</p>
              {turn.edits && <EditList edits={turn.edits} />}
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}

function TurnView({ turn, doc, reduce }: { turn: CreateTurn; doc?: ResumeDoc; reduce: boolean }) {
  const appear = reduce ? {} : { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25 } }
  const visible = turn.steps.filter((s, i) => s.state !== "pending" || turn.steps.slice(0, i).every((p) => p.state === "done"))

  return (
    <div className="space-y-5">
      <UserBubble text={turn.brief} reduce={reduce} />

      <div className="flex gap-3">
        <LogoMark className="mt-0.5 size-6 shrink-0" />
        <div className="min-w-0 flex-1">
          <ol className="relative space-y-3 border-l border-border pl-5">
            {visible.map((s) => (
              <motion.li key={s.label} {...appear} className="relative text-sm">
                <span className="absolute top-0.5 -left-[27px] flex size-3.5 items-center justify-center rounded-full bg-background">
                  {s.state === "done" ? <CheckCircle2 className="size-3.5 text-emerald-400" /> : s.state === "failed" ? <XCircle className="size-3.5 text-destructive" /> : s.state === "running" ? <Spinner className="size-3.5" /> : <CircleDashed className="size-3.5 text-muted-foreground/50" />}
                </span>
                <p className={s.state === "running" ? "text-foreground" : s.state === "pending" ? "text-muted-foreground/60" : "text-foreground/90"}>{s.label}</p>
                {s.detail && <p className={s.state === "failed" ? "text-destructive" : "text-muted-foreground"}>{s.detail}</p>}
              </motion.li>
            ))}
          </ol>
          {turn.result && <ResultCard result={{ ...turn.result, doc: doc ?? turn.result.doc }} reduce={reduce} />}
        </div>
      </div>
    </div>
  )
}

function ResultCard({ result, reduce }: { result: NonNullable<CreateTurn["result"]>; reduce: boolean }) {
  const { plan } = result
  const titles = new Map(result.doc.sections.flatMap((s) => s.entries.map((e) => [e.item_id, e.title] as const)))
  return (
    <motion.div
      {...(reduce ? {} : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35, delay: 0.1 } })}
      className="mt-5 flex flex-col gap-5 rounded-2xl border border-border bg-card p-4 sm:flex-row"
    >
      <Link href={`/resume/${result.resumeId}`} className="shrink-0 self-start overflow-hidden rounded-md border border-border transition hover:ring-2 hover:ring-foreground/20">
        <ResumeThumbnail doc={result.doc} width={150} />
      </Link>
      <div className="min-w-0 flex-1 space-y-3 text-sm">
        <p className="font-medium">{result.title}</p>
        <MatchReport match={{ summary: plan.summary, requirements: plan.requirements, reasons: plan.items }} titles={titles} onPage={new Set(titles.keys())} compact />
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild size="sm">
            <Link href={`/resume/${result.resumeId}`}>Open resume <ArrowRight /></Link>
          </Button>
          <span className="text-xs text-muted-foreground">The match report stays with the resume. Or ask for changes below.</span>
        </div>
      </div>
    </motion.div>
  )
}

// Under the prompt on Free: how many tailored resumes are left, at the moment one is being spent.
// The server blocks a new tailored resume once Free's allowance is used up; this says so first.
function TailoredAllowance({ usage }: { usage: PlanUsage }) {
  if (usage.plan !== "free") return null
  const t = allowanceStates(usage).find((a) => a.key === "tailored")!
  const reason = t.state === "out" ? `You've used all ${t.limit} free tailored resumes this month.` : `You have ${t.left} of ${t.limit} free tailored resumes left this month.`
  return (
    <p className={`mt-3 text-center text-xs ${t.state === "ok" ? "text-muted-foreground" : "text-amber-400"}`}>
      {t.state === "out"
        ? `You've used this month's ${t.limit} free tailored resumes. You can still edit the ones you have.`
        : `${t.left} of ${t.limit} free tailored resumes left this month.`}{" "}
      <UpgradeDialog reason={reason}>
        <button type="button" className="font-medium text-foreground underline-offset-4 hover:underline">Unlimited with Pro</button>
      </UpgradeDialog>
    </p>
  )
}

"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronDown, Circle, Github, GraduationCap, Plus, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { useConnectGitHub } from "@/hooks/use-connect-github"
import { addSources, stageExtract, stageFit, stageInterview, stageWrite, submitInterview, type ActionResult } from "@/lib/record/actions"
import type { InterviewCard } from "@/lib/record/pipeline"

type Phase = "connect" | "reading" | "interview" | "writing"
type StepState = "pending" | "running" | "done" | "failed"
interface Step {
  label: string
  state: StepState
  detail?: string
}

// Kinds answered with several picks (parts of a project); the rest are one tap.
const MULTI = new Set(["built", "ownership"])

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`
}

// The first-timer path: connect GitHub → we read it → a few tappable questions about what they
// built → the resume is written once, from their work and their answers.
export function FirstResumeFlow({ githubLogin, provider }: { githubLogin: string | null; provider: string }) {
  const router = useRouter()
  const params = useSearchParams()
  const github = useConnectGitHub("/start/new")
  const [phase, setPhase] = useState<Phase>("connect")
  const [steps, setSteps] = useState<Step[]>([])
  const [username, setUsername] = useState("")
  const [byUsername, setByUsername] = useState(false)
  const [school, setSchool] = useState("")
  const [extra, setExtra] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [cards, setCards] = useState<InterviewCard[]>([])
  const [answers, setAnswers] = useState<Record<string, string | null>>({})
  const returned = useRef(false)

  // Back from GitHub: say whether it worked; the connected state shows on the card.
  useEffect(() => {
    if (params.get("github") !== "connected" || returned.current || !github.ready) return
    returned.current = true
    router.replace("/start/new", { scroll: false })
    if (githubLogin) toast.success(`Connected GitHub as @${githubLogin}`)
    else toast.error(github.failureReason() ?? "GitHub wasn't connected. Try again?", { duration: 10000 })
  }, [params, githubLogin, github, router])

  const login = githubLogin ?? (byUsername ? username.trim() : "")
  const canStart = Boolean(login || school.trim() || extra.trim() || file)

  function set(i: number, patch: Partial<Step>) {
    setSteps((all) => all.map((s, n) => (n === i ? { ...s, ...patch } : s)))
  }

  async function step<T>(i: number, call: () => Promise<ActionResult<T>>, describe?: (d: T) => string | undefined): Promise<T | null> {
    set(i, { state: "running" })
    const res = await call()
    if (!res.ok) {
      set(i, { state: "failed", detail: res.error })
      return null
    }
    set(i, { state: "done", detail: describe?.(res.data) })
    return res.data
  }

  async function read() {
    setPhase("reading")
    setSteps([
      { label: login ? `Reading your GitHub (@${login})` : "Reading what you added", state: "pending" },
      { label: "Finding your strongest work", state: "pending" },
      { label: "Preparing a few quick questions", state: "pending" },
    ])
    const form = new FormData()
    if (githubLogin) form.set("useGithub", "on")
    else if (login) form.set("github", login)
    if (file) form.set("pdfs", file)
    const notes = [school.trim() && `Education: ${school.trim()}`, extra.trim()].filter(Boolean).join("\n\n")
    if (notes) form.set("paste", notes)

    const read = await step(0, () => addSources(form), (lines) => lines.map((l) => `${l.ok ? "" : "✗ "}${l.label}: ${l.detail}`).join(" · "))
    if (!read) return
    if (!read.some((l) => l.ok)) return set(0, { state: "failed", detail: read.map((l) => `${l.label}: ${l.detail}`).join(" · ") || "Nothing to read" })

    const found = await step(1, stageExtract, (d) => {
      const parts = [d.counts.project && plural(d.counts.project, "project"), d.counts.job && plural(d.counts.job, "job"), d.counts.education && plural(d.counts.education, "school")].filter(Boolean)
      return parts.length ? `Found ${parts.join(", ")}` : "Nothing we could use yet"
    })
    if (!found) return

    const questions = await step(2, stageInterview, (q) => (q.length ? `${plural(q.length, "question")}, about a minute` : "Nothing to ask, writing now"))
    if (!questions) return
    if (!questions.length) return write([])
    setCards(questions)
    setPhase("interview")
  }

  async function write(itemIds: string[]) {
    setPhase("writing")
    setSteps([
      { label: "Writing your resume from your work and answers", state: "pending" },
      { label: "Fitting it on one page", state: "pending" },
    ])
    const written = await step(0, () => stageWrite(undefined, itemIds), (d) => `${plural(d.written, "line")}, each backed by your work or your answers`)
    if (!written) return
    const fit = await step(1, () => stageFit(written.resumeId), (d) => (d.cuts ? `Moved ${plural(d.cuts, "weaker line")} off to keep one page` : "Fits on one page"))
    if (!fit) return
    router.push(`/resume/${written.resumeId}`)
  }

  async function finishInterview(final: Record<string, string | null>) {
    setPhase("writing")
    setSteps([{ label: "Saving your answers", state: "running" }])
    const res = await submitInterview(cards.map((c) => ({ id: c.id, answer: final[c.id] ?? null })))
    if (!res.ok) {
      setSteps([{ label: "Saving your answers", state: "failed", detail: res.error }])
      return
    }
    await write(res.data.itemIds)
  }

  const failed = steps.some((s) => s.state === "failed")

  return (
    <div className="mx-auto max-w-xl pt-10 pb-16">
      {phase === "connect" && (
        <>
          <h2 className="text-2xl font-medium tracking-tight">Let&apos;s build your first resume</h2>
          <p className="mt-2 text-muted-foreground">We read your GitHub, ask you a few quick questions about what you built, and write a one-page resume. Every line comes from your work or your answers.</p>

          <div className="mt-8 space-y-3">
            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <Github className="mt-0.5 size-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">GitHub</p>
                  <p className="text-sm text-muted-foreground">Read-only. We look at your repos, READMEs and the tools you use.</p>
                </div>
              </div>
              <div className="mt-4">
                {githubLogin ? (
                  <p className="flex items-center gap-2 text-sm"><CheckCircle2 className="size-4 text-emerald-400" /> Connected as @{githubLogin}</p>
                ) : byUsername ? (
                  <div className="flex gap-2">
                    <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="GitHub username" autoComplete="off" autoFocus />
                    <Button variant="ghost" onClick={() => { setByUsername(false); setUsername("") }}>Cancel</Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <Button onClick={github.connect} disabled={github.connecting || !github.ready}>
                      {github.connecting ? <Spinner /> : <Github />} Connect GitHub
                    </Button>
                    <button type="button" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline" onClick={() => setByUsername(true)}>
                      Use a username instead
                    </button>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <GraduationCap className="mt-0.5 size-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <Label htmlFor="school" className="font-medium">School <span className="font-normal text-muted-foreground">(recommended)</span></Label>
                  <p className="text-sm text-muted-foreground">GitHub doesn&apos;t know where you study. Degree, school and years.</p>
                </div>
              </div>
              <Input id="school" className="mt-4" value={school} onChange={(e) => setSchool(e.target.value)} maxLength={300} placeholder="e.g. BSc Computer Science, Tribhuvan University, 2023–2027" autoComplete="off" />
            </section>

            <Collapsible className="rounded-2xl border border-border bg-card">
              <CollapsibleTrigger className="group flex w-full items-center gap-3 p-5 text-left">
                <Plus className="size-5 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">Anything else? <span className="font-normal text-muted-foreground">(optional)</span></span>
                  <span className="block text-sm text-muted-foreground">LinkedIn, hackathons, clubs, freelance work.</span>
                </span>
                <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 px-5 pb-5">
                <div className="space-y-2">
                  <Label htmlFor="linkedin" className="text-sm">LinkedIn PDF or data export ZIP</Label>
                  <Input id="linkedin" type="file" accept="application/pdf,.zip,application/zip" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="extra" className="text-sm">Other things you&apos;ve done</Label>
                  <Textarea id="extra" rows={3} maxLength={5000} value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Won 2nd place at a hackathon, built a site for my uncle's shop, ran the coding club…" />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button size="lg" onClick={read} disabled={!canStart}>Read my work <ArrowRight /></Button>
            <span className="text-sm text-muted-foreground">{canStart ? "Takes about a minute." : "Connect GitHub or add your school to start."}</span>
          </div>
          <p className="mt-10 text-xs text-muted-foreground">Your sources are processed by {provider}. Everything stays private in your account.</p>
        </>
      )}

      {(phase === "reading" || phase === "writing") && (
        <>
          <h2 className="text-2xl font-medium tracking-tight">{phase === "reading" ? "Reading your work" : "Writing your resume"}</h2>
          <p className="mt-2 text-muted-foreground">{failed ? "Something went wrong. You can try again." : "Keep this tab open, it takes about a minute."}</p>
          <ol className="mt-8 space-y-4 rounded-2xl border border-border bg-card p-5">
            {steps.map((s) => (
              <li key={s.label} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 shrink-0">
                  {s.state === "done" ? <CheckCircle2 className="size-4 text-emerald-400" /> : s.state === "failed" ? <XCircle className="size-4 text-destructive" /> : s.state === "running" ? <Spinner className="size-4" /> : <Circle className="size-4 text-muted-foreground/40" />}
                </span>
                <div className="min-w-0">
                  <p className={s.state === "pending" ? "text-muted-foreground/60" : "font-medium"}>{s.label}</p>
                  {s.detail && <p className={s.state === "failed" ? "text-destructive" : "text-muted-foreground"}>{s.detail}</p>}
                </div>
              </li>
            ))}
          </ol>
          {failed && (
            <div className="mt-6 flex gap-2">
              <Button onClick={() => (phase === "writing" && cards.length ? finishInterview(answers) : phase === "writing" ? write([]) : read())}>Try again</Button>
              <Button variant="ghost" onClick={() => setPhase("connect")}>Back</Button>
            </div>
          )}
        </>
      )}

      {phase === "interview" && (
        <Interview
          cards={cards}
          onDone={(final) => {
            setAnswers(final)
            finishInterview(final)
          }}
        />
      )}
    </div>
  )
}

// Picked options plus anything typed, as one answer; null when the question was skipped.
function joined(picked: Record<string, string[]>, typed: Record<string, string>, id: string): string | null {
  return [...(picked[id] ?? []), typed[id]?.trim()].filter(Boolean).join(", ") || null
}

// One question at a time. Single-choice questions advance on tap; "what did you build" takes
// several picks; every question takes free text and can be skipped.
function Interview({ cards, onDone }: { cards: InterviewCard[]; onDone: (answers: Record<string, string | null>) => void }) {
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<Record<string, string[]>>({})
  const [typed, setTyped] = useState<Record<string, string>>({})
  const card = cards[index]
  const multi = MULTI.has(card.kind)
  const free = !card.options.length
  const chosen = picked[card.id] ?? []
  const text = typed[card.id] ?? ""
  const last = index === cards.length - 1

  // State updates land after this call, so callers pass the values they just changed.
  function next(nextPicked = picked, nextTyped = typed) {
    if (!last) return setIndex(index + 1)
    onDone(Object.fromEntries(cards.map((c) => [c.id, joined(nextPicked, nextTyped, c.id)])))
  }

  function tap(option: string) {
    if (multi) {
      setPicked({ ...picked, [card.id]: chosen.includes(option) ? chosen.filter((o) => o !== option) : [...chosen, option] })
      return
    }
    const nextPicked = { ...picked, [card.id]: [option] }
    const nextTyped = { ...typed, [card.id]: "" }
    setPicked(nextPicked)
    setTyped(nextTyped)
    // A single tap answers the question; a short pause shows the choice before moving on.
    setTimeout(() => next(nextPicked, nextTyped), 180)
  }

  return (
    <div>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Question {index + 1} of {cards.length}</span>
        <button type="button" className="hover:text-foreground" onClick={() => onDone(Object.fromEntries(cards.map((c) => [c.id, joined(picked, typed, c.id)])))}>
          Skip the rest
        </button>
      </div>
      <Progress value={((index + 1) / cards.length) * 100} className="mt-3 h-1" />

      <div key={card.id} className="mt-10 animate-in fade-in slide-in-from-right-2 duration-200">
        <p className="text-sm text-muted-foreground">{card.item_title}</p>
        <h2 className="mt-1 text-2xl font-medium tracking-tight">{card.prompt}</h2>
        {multi && <p className="mt-2 text-sm text-muted-foreground">Pick all that were yours.</p>}

        {!free && (
          <div className="mt-6 flex flex-wrap gap-2">
            {card.options.map((o) => {
              const on = chosen.includes(o)
              return (
                <Button key={o} variant={on ? "default" : "outline"} className="h-auto rounded-full px-4 py-2 whitespace-normal" onClick={() => tap(o)}>
                  {on && multi && <Check />} {o}
                </Button>
              )
            })}
          </div>
        )}

        {free ? (
          <Textarea className="mt-6" rows={3} maxLength={500} value={text} onChange={(e) => setTyped({ ...typed, [card.id]: e.target.value })} placeholder="A sentence is plenty. Plain words are fine." autoFocus />
        ) : (
          <Input className="mt-4" maxLength={300} value={text} onChange={(e) => setTyped({ ...typed, [card.id]: e.target.value })} placeholder={multi ? "Something else? Type it here" : "Or type your own answer"} />
        )}
      </div>

      <div className="mt-10 flex items-center justify-between gap-2">
        <Button variant="ghost" onClick={() => setIndex(index - 1)} disabled={index === 0}><ArrowLeft /> Back</Button>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              const nextPicked = { ...picked, [card.id]: [] }
              const nextTyped = { ...typed, [card.id]: "" }
              setPicked(nextPicked)
              setTyped(nextTyped)
              next(nextPicked, nextTyped)
            }}
          >
            Skip
          </Button>
          <Button onClick={() => next()} disabled={!chosen.length && !text.trim()}>
            {last ? "Write my resume" : "Next"} <ArrowRight />
          </Button>
        </div>
      </div>
    </div>
  )
}

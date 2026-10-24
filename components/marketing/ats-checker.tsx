"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import { motion, useReducedMotion } from "motion/react"
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronDown, FileText, RotateCcw, ScanText, Upload, XCircle } from "lucide-react"
import SpotlightCard from "@/components/SpotlightCard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import type { AtsReport, AtsStatus } from "@/lib/ats/analyze"
import type { KeywordMatch } from "@/lib/ats/keywords"
import { cn } from "@/lib/utils"

// A result is tied to the file and job post it was made from, and cleared when either changes.
type Result = AtsReport & { keywords: KeywordMatch | null; fileName: string; checkedAt: number }

const ICON: Record<AtsStatus, React.ReactNode> = {
  pass: <CheckCircle2 className="size-5 text-emerald-400" />,
  warn: <AlertTriangle className="size-5 text-signal" />,
  fail: <XCircle className="size-5 text-red-400" />,
}

export function AtsChecker({ cta }: { cta: { href: string; label: string } }) {
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [jobPost, setJobPost] = useState("")
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  // Bumped whenever the file or job post changes, so a response for older inputs is thrown away.
  const revision = useRef(0)

  function pick(f: File | undefined | null) {
    setError(null)
    if (!f) return
    revision.current++
    setBusy(false)
    setResult(null)
    if (f.type && f.type !== "application/pdf") {
      setFile(null)
      if (input.current) input.current.value = ""
      return setError("Choose a PDF. Export your resume as PDF first.")
    }
    setFile(f)
  }

  async function check() {
    if (!file) return input.current?.click()
    const asked = ++revision.current
    setBusy(true)
    setError(null)
    const form = new FormData()
    form.set("file", file)
    if (jobPost.trim()) form.set("jobPost", jobPost)
    try {
      const res = await fetch("/api/ats-check", { method: "POST", body: form })
      const data = await res.json()
      if (asked !== revision.current) return
      if (!res.ok) throw new Error(data.error ?? "Something went wrong. Try again.")
      setResult({ ...data, fileName: file.name, checkedAt: Date.now() })
      requestAnimationFrame(() => document.getElementById("ats-report")?.scrollIntoView({ behavior: "smooth", block: "start" }))
    } catch (err) {
      if (asked === revision.current) setError(err instanceof Error ? err.message : "Something went wrong. Try again.")
    } finally {
      if (asked === revision.current) setBusy(false)
    }
  }

  function reset() {
    revision.current++
    setBusy(false)
    setResult(null)
    setFile(null)
    if (input.current) input.current.value = ""
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div className="mx-auto max-w-3xl">
      <SpotlightCard spotlightColor="rgba(255, 255, 255, 0.08)" className="rounded-[2rem] bg-card p-5 md:p-7">
        <div className="relative space-y-4">
          <button
            type="button"
            onClick={() => input.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0]) }}
            className={cn(
              "flex w-full flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-10 text-center transition-colors",
              dragging ? "border-foreground/40 bg-foreground/[0.04]" : "border-border hover:border-foreground/25 hover:bg-foreground/[0.02]"
            )}
          >
            <span className="grid size-12 place-items-center rounded-2xl bg-foreground/[0.05] ring-1 ring-foreground/10">
              {file ? <FileText className="size-5" /> : <Upload className="size-5" />}
            </span>
            {file ? (
              <span>
                <span className="block font-medium">{file.name}</span>
                <span className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(0)} KB · click to choose another</span>
              </span>
            ) : (
              <span>
                <span className="block font-medium">Drop your resume PDF here</span>
                <span className="text-sm text-muted-foreground">or click to choose a file · up to 5 MB</span>
              </span>
            )}
          </button>
          <input ref={input} type="file" accept="application/pdf" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => pick(e.target.files?.[0])} />

          <Collapsible>
            <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-xl px-1 py-1 text-left text-sm">
              <span><span className="font-medium">Checking for a specific job?</span> <span className="text-muted-foreground">Paste the post to see which keywords you&apos;re missing.</span></span>
              <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <label htmlFor="ats-job-post" className="sr-only">Job post (optional)</label>
              <Textarea id="ats-job-post" rows={5} maxLength={20000} value={jobPost} onChange={(e) => { revision.current++; setBusy(false); setJobPost(e.target.value); setResult(null) }} placeholder="Paste the job description here (optional)" />
            </CollapsibleContent>
          </Collapsible>

          <div aria-live="polite" className="sr-only">{busy ? "Checking your resume" : result ? `Report ready for ${result.fileName}` : ""}</div>
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

          <Button size="lg" onClick={check} disabled={busy} className="group h-11 w-full rounded-full text-[15px]">
            {busy ? <Spinner /> : <ScanText />} {busy ? "Checking…" : "Check my resume"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">Free, no sign-up. Your file is read once and never stored.</p>
        </div>
      </SpotlightCard>

      {result && <Report result={result} onReset={reset} cta={cta} />}
    </div>
  )
}

function Report({ result, onReset, cta }: { result: Result; onReset: () => void; cta: { href: string; label: string } }) {
  const reduce = useReducedMotion()
  const passed = result.verdict === "pass"
  const fixes = result.checks.filter((c) => c.status !== "pass").length
  const missing = result.missingInfo
  const good = passed && !missing.length
  return (
    <motion.section
      id="ats-report"
      className="mt-10 scroll-mt-24 space-y-4"
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <p className="text-sm text-muted-foreground">
        Report for <span className="text-foreground">{result.fileName}</span>, checked at {new Date(result.checkedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
      </p>
      <div className={cn("flex flex-wrap items-center gap-6 rounded-3xl border p-6 md:p-8", good ? "border-emerald-400/20 bg-emerald-400/[0.04]" : passed ? "border-signal/20 bg-signal/[0.04]" : "border-red-400/20 bg-red-400/[0.04]")}>
        <ScoreRing score={result.score} passed={good} />
        <div className="min-w-0 flex-1">
          <Badge variant="outline" className={cn("rounded-full font-normal", good ? "border-emerald-400/30 text-emerald-300" : passed ? "border-signal/30 text-signal" : "border-red-400/30 text-red-300")}>
            {passed ? "Text extracts cleanly" : "Almost no text extracted"}
          </Badge>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">
            {!passed
              ? "We could barely read any text from this PDF"
              : missing.length
                ? `Readable, but missing ${missing.join(" and ")}`
                : fixes
                  ? `Readable, with ${fixes} thing${fixes === 1 ? "" : "s"} to improve`
                  : "Clean and easy to parse"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {!passed
              ? "It is probably an image or a design export. Software that reads resumes would see it as nearly blank."
              : missing.length
                ? "Our parser read the file fine, but couldn't find the items marked red. Add them as plain text."
                : "Our parser could pull your details out of this file."}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Based on our own parser and common ATS problems. Every ATS differs, so this can&apos;t promise a result in any particular one.</p>
        </div>
      </div>

      <div className="divide-y divide-border overflow-hidden rounded-[2rem] bg-card">
        {result.checks.map((c) => (
          <div key={c.id} className="flex gap-4 p-5">
            <span className="mt-0.5 shrink-0">{ICON[c.status]}</span>
            <div className="min-w-0">
              <p className="font-medium">{c.label}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{c.detail}</p>
              {c.fix && <p className="mt-2 text-sm"><span className="text-muted-foreground">Fix: </span>{c.fix}</p>}
            </div>
          </div>
        ))}
      </div>

      {result.keywords && (
        <div className="rounded-[2rem] bg-card p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-medium">Job post keywords</h3>
            <span className="text-sm tabular-nums text-muted-foreground">{result.keywords.found.length} of {result.keywords.found.length + result.keywords.missing.length} · {result.keywords.percent}%</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {result.keywords.found.map((k) => <Badge key={k} variant="secondary" className="rounded-full gap-1"><CheckCircle2 className="size-3 text-emerald-400" />{k}</Badge>)}
            {result.keywords.missing.map((k) => <Badge key={k} variant="outline" className="rounded-full text-muted-foreground">{k}</Badge>)}
          </div>
          {result.keywords.missing.length > 0 && (
            <p className="mt-4 text-sm text-muted-foreground">Add the missing ones only where they&apos;re true: name the tool in the bullet where you used it. Keyword-stuffing gets noticed by people, not just software.</p>
          )}
        </div>
      )}

      <Collapsible className="rounded-[2rem] bg-card">
        <CollapsibleTrigger className="group flex w-full items-center justify-between p-6 text-left">
          <span>
            <span className="block font-medium">What an ATS reads</span>
            <span className="text-sm text-muted-foreground">The raw text pulled from your PDF, in reading order. If it&apos;s jumbled here, it&apos;s jumbled there.</span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-6 pb-6">
          <pre className="max-h-96 overflow-auto rounded-xl bg-background/80 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">{result.preview || "(no text found)"}</pre>
        </CollapsibleContent>
      </Collapsible>

      <SpotlightCard spotlightColor="rgba(255, 255, 255, 0.12)" className="rounded-[2rem] bg-card p-6 text-center md:p-10">
        <div className="relative">
          <h3 className="text-2xl font-semibold tracking-tight md:text-3xl">{passed && !fixes ? "Now make it say more" : "Get a resume that passes, from your real work"}</h3>
          <p className="mx-auto mt-2 max-w-lg text-muted-foreground">DevProfile writes a clean, single-column resume from your GitHub and old resume, in a format every ATS reads. Free to build and download.</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="group h-11 rounded-full px-6">
              <Link href={cta.href}>{cta.label} <ArrowRight className="transition-transform group-hover:translate-x-0.5" /></Link>
            </Button>
            <Button size="lg" variant="ghost" className="h-11 rounded-full" onClick={onReset}><RotateCcw /> Check another</Button>
          </div>
        </div>
      </SpotlightCard>
    </motion.section>
  )
}

function ScoreRing({ score, passed }: { score: number; passed: boolean }) {
  const r = 34
  const c = 2 * Math.PI * r
  return (
    <div className="relative grid size-24 shrink-0 place-items-center">
      <svg viewBox="0 0 80 80" className="absolute inset-0 -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="6" className="stroke-foreground/10" />
        <motion.circle
          cx="40" cy="40" r={r} fill="none" strokeWidth="6" strokeLinecap="round"
          className={passed ? "stroke-emerald-400" : "stroke-red-400"}
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - score / 100) }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <span className="text-2xl font-semibold tabular-nums">{score}</span>
    </div>
  )
}

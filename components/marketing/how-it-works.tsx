"use client"

import { FileText, GitPullRequest } from "lucide-react"
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { GitHubIcon, LinkedInIcon } from "./brand-icons"

const steps = [
  {
    title: "Connect your sources",
    body: "Add your GitHub username, upload your LinkedIn PDF or an old resume, and optionally links to pull requests you merged.",
    visual: <SourcesVisual />,
  },
  {
    title: "Get your resume",
    body: "DevProfile picks your strongest work, writes every line from your sources, and sets it on one page.",
    visual: <ResumeVisual />,
  },
  {
    title: "Stay current",
    body: "After you ship, press Sync. New work is read and added, and the lines you edited by hand stay yours.",
    visual: <UpdateVisual />,
  },
]

// A step counts as reached once the line is at (or just short of) its node.
const thresholds = [0, 0.48, 0.97]

export function HowItWorks() {
  // Desktop: the section pins to the viewport and scrolling moves the line instead of the page.
  // Mobile: the steps are too tall to pin, so the line just follows the page scroll.
  const pinRef = useRef<HTMLElement>(null)
  const listRef = useRef<HTMLOListElement>(null)
  const pinnedRef = useRef(false)

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)")
    const update = () => {
      pinnedRef.current = mq.matches
    }
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])

  const { scrollYProgress: pinProgress } = useScroll({ target: pinRef, offset: ["start start", "end end"] })
  const { scrollYProgress: flowProgress } = useScroll({ target: listRef, offset: ["start 0.8", "end 0.55"] })
  // Leave a little scroll at each end so the line starts after the pin and rests full before release.
  const pinLine = useTransform(pinProgress, [0.08, 0.85], [0, 1], { clamp: true })
  const raw = useTransform([pinLine, flowProgress], ([pin, flow]: number[]) => (pinnedRef.current ? pin : flow))
  const progress = useSpring(raw, { stiffness: 140, damping: 26, mass: 0.4 })
  const glowX = useTransform(progress, (p) => `${p * 100}%`)
  const [reached, setReached] = useState(0)

  useMotionValueEvent(progress, "change", (p) => {
    setReached(thresholds.filter((t) => p >= t).length)
  })

  return (
    <section ref={pinRef} id="how-it-works" className="relative border-t md:h-[300vh]">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 md:sticky md:top-0 md:flex md:h-screen md:flex-col md:justify-center md:py-0">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-4xl font-semibold tracking-[-0.03em] text-balance md:text-5xl">
            Three steps, then one click to stay current
          </h2>
          <p className="mt-4 text-lg text-pretty text-muted-foreground">
            Set it up once. After that, a sync brings your resume up to date with your work.
          </p>
        </div>

        <ol ref={listRef} className="relative mt-20 grid md:mt-16 md:grid-cols-3">
          {/* Track and fill: horizontal on desktop, from the center of the first column to the last */}
          <div aria-hidden="true" className="absolute top-[18px] left-[16.666%] hidden h-px w-[66.666%] md:block">
            <div className="absolute inset-0 bg-border" />
            <motion.div
              className="absolute inset-0 origin-left bg-gradient-to-r from-foreground/30 via-foreground/80 to-foreground"
              style={{ scaleX: progress }}
            />
            <motion.div
              className="absolute top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/10 blur-2xl"
              style={{ left: glowX }}
            />
            <motion.div
              className="absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground"
              style={{ left: glowX }}
            />
          </div>

          {/* Vertical on mobile */}
          <div aria-hidden="true" className="absolute top-[18px] bottom-10 left-[18px] w-px md:hidden">
            <div className="absolute inset-0 bg-border" />
            <motion.div
              className="absolute inset-0 origin-top bg-gradient-to-b from-foreground/30 via-foreground/80 to-foreground"
              style={{ scaleY: progress }}
            />
          </div>

          {steps.map((step, i) => {
            const active = reached > i
            return (
              <li key={step.title} className="relative pb-14 pl-14 md:flex md:flex-col md:items-center md:px-6 md:pb-0 md:text-center">
                <span
                  className={cn(
                    "absolute top-0 left-0 z-10 grid size-9 place-items-center rounded-full border text-sm tabular-nums transition-all duration-500 md:relative",
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-muted-foreground"
                  )}
                >
                  {i + 1}
                </span>
                <div
                  className={cn(
                    "transition-opacity duration-500 md:mt-8 md:flex md:flex-col md:items-center",
                    active ? "opacity-100" : "opacity-40"
                  )}
                >
                  <h3 className="pt-1.5 text-lg font-medium tracking-tight md:pt-0">{step.title}</h3>
                  <p className="mt-2 max-w-sm leading-relaxed text-pretty text-muted-foreground">{step.body}</p>
                  <div
                    className={cn(
                      "mt-6 w-full max-w-sm rounded-2xl border bg-card/50 p-4 text-left transition-all duration-500",
                      active ? "translate-y-0 border-foreground/15" : "translate-y-2"
                    )}
                  >
                    {step.visual}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

function SourcesVisual() {
  const items = [
    { icon: GitHubIcon, label: "mayachen" },
    { icon: LinkedInIcon, label: "Profile.pdf" },
    { icon: FileText, label: "resume-2023.pdf" },
    { icon: GitPullRequest, label: "3 merged PRs" },
  ]
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map(({ icon: Icon, label }) => (
        <div key={label} className="flex items-center gap-2 rounded-xl bg-card px-2.5 py-2 text-xs">
          <Icon className="size-3.5 shrink-0" />
          <span className="truncate text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  )
}

function ResumeVisual() {
  return (
    <div className="rounded-lg bg-white px-4 py-3 font-serif text-[9px] leading-snug text-neutral-800">
      <p className="text-center text-[13px] [font-variant:small-caps]">Maya Chen</p>
      <p className="mt-1.5 border-b border-neutral-700 [font-variant:small-caps]">Experience</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-3">
        <li>Led the React Native new-architecture migration</li>
        <li>Built the experimentation SDK; 120+ live tests</li>
      </ul>
      <p className="mt-1.5 border-b border-neutral-700 [font-variant:small-caps]">Projects</p>
      <ul className="mt-1 list-disc pl-3">
        <li>tidal: CRDT sync engine, 2.3k stars</li>
      </ul>
    </div>
  )
}

function UpdateVisual() {
  return (
    <div className="space-y-2 font-mono text-[11px]">
      <div className="truncate rounded-xl bg-card px-2.5 py-2 text-muted-foreground">
        Sync GitHub
      </div>
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.07] px-2.5 py-2 text-emerald-300">
        + Shipped offline sync for 40k weekly users
      </div>
      <div className="rounded-lg border border-red-500/15 bg-red-500/[0.05] px-2.5 py-2 text-red-300/80">
        - Shortened 2019 internship to fit
      </div>
    </div>
  )
}

"use client"

import Link from "next/link"
import { useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { ArrowRight, Check } from "lucide-react"
import SpotlightCard from "@/components/SpotlightCard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Billing = "monthly" | "pass"

const PRO_PRICE: Record<Billing, { amount: string; period: string; note: string }> = {
  monthly: { amount: "$12", period: "/ month", note: "Renews monthly. Cancel in one click and keep Pro to the end of the month." },
  pass: { amount: "$29", period: "/ 3 months", note: "One payment. Ends after 90 days and never renews. About $9.67 a month." },
}

const FREE_FEATURES = [
  "Build your resume from GitHub, LinkedIn or an old PDF",
  "Unlimited PDF and LaTeX downloads, no watermark",
  "Unlimited editing, checks and parser view",
  "3 tailored resumes a month",
  "20 AI fixes a month",
  "2 rebuilds or source syncs a month",
]

const PRO_FEATURES = [
  "Unlimited tailored resumes",
  "A match report for every job you paste",
  "Unlimited AI fixes and chat edits",
  "Sync GitHub and LinkedIn anytime",
  "Every version you sent, kept forever",
  "First access to cover letters and interview prep",
]

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="relative mt-8 space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-[15px] leading-snug">
          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-white/[0.06] ring-1 ring-white/10">
            <Check className="size-3" />
          </span>
          <span className="text-foreground/85">{item}</span>
        </li>
      ))}
    </ul>
  )
}

// Both buttons go to `cta.href`: the waitlist during early access, sign-up once the app is open.
export function PricingPlans({ cta }: { cta: { href: string; label: string; proLabel: string } }) {
  const [billing, setBilling] = useState<Billing>("pass")
  const reduce = useReducedMotion()
  const pro = PRO_PRICE[billing]

  return (
    <div>
      <div className="flex justify-center">
        <Tabs value={billing} onValueChange={(v) => setBilling(v as Billing)}>
          <TabsList className="h-10 rounded-full border border-white/10 bg-white/[0.03] p-1">
            <TabsTrigger value="monthly" className="rounded-full px-4">Monthly</TabsTrigger>
            <TabsTrigger value="pass" className="gap-2 rounded-full px-4">
              3-month pass
              <Badge variant="secondary" className="rounded-full px-1.5 py-0 text-[11px]">Save 20%</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-2">
        <SpotlightCard spotlightColor="rgba(255, 255, 255, 0.08)" className="flex flex-col rounded-3xl border bg-card/60 p-7 md:p-8">
          <div className="relative">
            <h3 className="text-lg font-medium">Free</h3>
            <p className="mt-1 text-sm text-muted-foreground">A resume you&apos;re proud of, and a few tailored versions.</p>
            <p className="mt-6 flex items-baseline gap-1.5">
              <span className="text-5xl font-semibold tracking-[-0.04em]">$0</span>
              <span className="text-muted-foreground">forever</span>
            </p>
            <p className="mt-2 min-h-10 text-sm text-muted-foreground">No card needed. Your PDF is never behind a paywall.</p>
          </div>
          <FeatureList items={FREE_FEATURES} />
          <div className="relative mt-auto pt-10">
            <Button asChild variant="secondary" size="lg" className="h-11 w-full rounded-full">
              <Link href={cta.href}>{cta.label}</Link>
            </Button>
          </div>
        </SpotlightCard>

        <SpotlightCard
          spotlightColor="rgba(255, 255, 255, 0.14)"
          className="flex flex-col rounded-3xl border border-white/20 bg-card/80 p-7 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_30px_80px_-30px_rgba(255,255,255,0.25)] md:p-8"
        >
          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-medium">Pro</h3>
              <Badge variant="outline" className="rounded-full border-white/15 bg-white/[0.04] font-normal">For active job hunts</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">A tailored resume for every job you apply to.</p>
            <p className="mt-6 flex items-baseline gap-1.5">
              <span className="relative inline-flex h-12 items-baseline overflow-hidden">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={pro.amount}
                    className="text-5xl font-semibold tracking-[-0.04em]"
                    initial={reduce ? false : { y: 24, opacity: 0, filter: "blur(6px)" }}
                    animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                    exit={reduce ? undefined : { y: -24, opacity: 0, filter: "blur(6px)" }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {pro.amount}
                  </motion.span>
                </AnimatePresence>
              </span>
              <span className="text-muted-foreground">{pro.period}</span>
            </p>
            <p className="mt-2 min-h-10 text-sm text-muted-foreground">{pro.note}</p>
          </div>
          <p className="relative mt-8 text-sm text-muted-foreground">Everything in Free, plus:</p>
          <div className="-mt-5"><FeatureList items={PRO_FEATURES} /></div>
          <div className="relative mt-auto pt-10">
            <Button
              asChild
              size="lg"
              className="group h-11 w-full rounded-full shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_8px_30px_-6px_rgba(255,255,255,0.35)]"
            >
              <Link href={cta.href}>
                {cta.proLabel}
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </div>
        </SpotlightCard>
      </div>
    </div>
  )
}

"use client"

import Link from "next/link"
import { AlertTriangle, ArrowRight, Check, Sparkles } from "lucide-react"
import { UpgradeDialog } from "@/components/app/upgrade-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ALLOWANCE_LABELS, allowanceStates, PLANS, PRO_PRICE, upgradeReason, type PlanUsage } from "@/lib/plans"

export function PlanCard({ usage }: { usage: PlanUsage }) {
  const states = allowanceStates(usage)
  const reason = upgradeReason(states)
  const resets = new Date(usage.resetsAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })

  return (
    <section className="h-fit overflow-hidden rounded-2xl border border-border bg-card">
      <div className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Your plan</h3>
          <Badge variant="secondary" className="rounded-full">{PLANS[usage.plan].name}</Badge>
        </div>

        {usage.unavailable && (
          <p role="alert" className="mt-3 text-xs text-amber-400">We couldn&apos;t load your plan and usage just now, so these numbers may be wrong. Refresh to try again.</p>
        )}
        <div className="mt-4 space-y-4">
          {states.map((s) => (
            <div key={s.key}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span>{ALLOWANCE_LABELS[s.key].title}</span>
                <span className={`tabular-nums ${s.state === "ok" ? "text-muted-foreground" : "text-amber-400"}`}>
                  {s.limit == null ? "Unlimited" : `${Math.min(s.used, s.limit)} / ${s.limit}`}
                </span>
              </div>
              {s.limit != null && (
                <Progress
                  value={Math.min(100, (s.used / s.limit) * 100)}
                  className={`mt-2 h-1.5 ${s.state === "ok" ? "" : "[&>[data-slot=progress-indicator]]:bg-amber-400"}`}
                />
              )}
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          {usage.plan === "free" ? `Refills ${resets}. ` : ""}Editing, checks and PDF downloads are always free and unlimited.
        </p>
      </div>

      {usage.billing && (
        <div className="border-t border-border p-5">
          <p className={`flex gap-2 text-sm ${usage.billing.pastDue ? "text-amber-400" : "text-muted-foreground"}`}>
            {usage.billing.pastDue && <AlertTriangle className="mt-0.5 size-4 shrink-0" />} {billingLine(usage.billing)}
          </p>
          <Button asChild variant={usage.billing.pastDue ? "default" : "outline"} className="mt-4 w-full rounded-full">
            <Link href="/billing">{usage.billing.pastDue ? "Fix payment" : "Plan & billing"} <ArrowRight /></Link>
          </Button>
        </div>
      )}

      {usage.plan === "free" && (
        <div className="border-t border-border bg-[radial-gradient(90%_120%_at_100%_0%,rgba(255,255,255,0.07),transparent)] p-5">
          <p className="flex items-center gap-2 text-sm font-medium"><Sparkles className="size-4" /> Applying to lots of jobs?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {reason ?? "Each job deserves its own resume. Pro makes one for every application, in under a minute."}
          </p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {["Unlimited tailored resumes", "A match report for every job", "Unlimited AI fixes"].map((t) => (
              <li key={t} className="flex items-center gap-2"><Check className="size-3.5 text-muted-foreground" /> {t}</li>
            ))}
          </ul>
          <UpgradeDialog reason={reason}>
            <Button className="mt-4 w-full rounded-full"><Sparkles /> Upgrade to Pro · ${PRO_PRICE.monthly}/mo</Button>
          </UpgradeDialog>
          <p className="mt-2 text-center text-xs text-muted-foreground">or ${PRO_PRICE.pass} for 3 months, never renews</p>
        </div>
      )}
    </section>
  )
}

export function day(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// One sentence: what Pro costs them and until when.
export function billingLine(billing: NonNullable<PlanUsage["billing"]>) {
  return billing.source === "pass"
    ? `3-month pass. Pro until ${day(billing.periodEnd)}, then back to Free. Never renews.`
    : billing.pastDue
      ? `Your last payment didn't go through. Update your card by ${day(billing.periodEnd)} to keep Pro.`
      : billing.cancelAtPeriodEnd
        ? `Cancelled. You keep Pro until ${day(billing.periodEnd)}, then you're on Free.`
        : `$${PRO_PRICE.monthly} a month. Renews ${day(billing.periodEnd)}.`
}

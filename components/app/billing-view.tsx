"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { AlertTriangle, ArrowUpRight } from "lucide-react"
import { toast } from "sonner"
import { PaymentPending } from "@/components/app/payment-pending"
import { PLAN_ROWS } from "@/components/app/plan-rows"
import { UpgradeDialog } from "@/components/app/upgrade-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { openBillingPortal, setCancelAtPeriodEnd } from "@/lib/plan-actions"
import type { ActionResult } from "@/lib/record/actions"
import { ALLOWANCE_LABELS, allowanceStates, PLANS, PRO_PRICE, upgradeReason, type PlanUsage } from "@/lib/plans"

type Billing = NonNullable<PlanUsage["billing"]>

const date = (iso: string, year = true) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", ...(year ? { year: "numeric" } : {}), timeZone: "UTC" })

function status(b: Billing) {
  if (b.source === "pass") return `Pro until ${date(b.periodEnd)}. The pass ends then and never renews.`
  if (b.pastDue) return `Your last payment didn't go through. Update your card by ${date(b.periodEnd)} to keep Pro.`
  if (b.cancelAtPeriodEnd) return `Cancelled. You keep Pro until ${date(b.periodEnd)}, then move to Free.`
  return `Renews on ${date(b.periodEnd)}.`
}

// Settings-style page: a label column, then the content. Everything about money, nothing else.
export function BillingView({ usage, email, upgraded }: { usage: PlanUsage; email?: string; upgraded?: boolean }) {
  const states = allowanceStates(usage)
  const pro = usage.plan === "pro"
  const b = usage.billing

  return (
    <div className="mx-auto max-w-4xl pt-4 pb-16">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">Plan & billing</h2>
        <p className="mt-1 text-sm text-muted-foreground">Manage your plan and see what you&apos;ve used this month.</p>
      </header>

      {(upgraded || usage.unavailable) && (
        <div className="mt-6 space-y-3">
          {upgraded && <PaymentPending pro={pro} />}
          {usage.unavailable && (
            <p role="alert" className="text-sm text-amber-400">We couldn&apos;t load your plan just now, so this page may be out of date. Refresh to try again.</p>
          )}
        </div>
      )}

      <Separator className="my-8" />

      <Row title="Plan" description="What you're on and what it costs.">
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-start justify-between gap-4 p-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-medium">{pro ? (b?.source === "pass" ? "Pro · 3-month pass" : "Pro · Monthly") : PLANS.free.name}</p>
                {b?.pastDue && <Badge variant="outline" className="rounded-full border-amber-400/30 font-normal text-amber-400">Payment failed</Badge>}
                {b?.cancelAtPeriodEnd && <Badge variant="outline" className="rounded-full font-normal text-muted-foreground">Cancelled</Badge>}
              </div>
              <p className={`mt-1 text-sm ${b?.pastDue ? "text-amber-400" : "text-muted-foreground"}`}>
                {b ? status(b) : `${PLANS.free.limits.tailored} tailored resumes, ${PLANS.free.limits.fixes} AI fixes and ${PLANS.free.limits.updates} syncs each month.`}
              </p>
            </div>
            <p className="shrink-0 text-right">
              <span className="text-2xl font-semibold tracking-tight tabular-nums">${pro ? (b?.source === "pass" ? PRO_PRICE.pass : PRO_PRICE.monthly) : 0}</span>
              <span className="block text-xs text-muted-foreground">{pro ? (b?.source === "pass" ? "paid once" : "per month") : "forever"}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/30 px-5 py-3">
            {b ? <ProActions billing={b} /> : (
              <>
                <p className="text-sm text-muted-foreground">Pro is ${PRO_PRICE.monthly}/month, or ${PRO_PRICE.pass} for 3 months.</p>
                <UpgradeDialog reason={upgradeReason(states)}>
                  <Button size="sm">Upgrade to Pro</Button>
                </UpgradeDialog>
              </>
            )}
          </div>
        </div>
      </Row>

      <Separator className="my-8" />

      <Row title="Usage" description={pro ? "Unlimited on Pro. Shown so you know what you've used." : `Refills on ${date(usage.resetsAt, false)}. Only AI work that succeeded is counted.`}>
        <div className="divide-y divide-border rounded-xl border border-border bg-card">
          {states.map((s) => (
            <div key={s.key} className="px-5 py-4">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span>{ALLOWANCE_LABELS[s.key].title}</span>
                <span className={`tabular-nums ${s.state === "out" ? "text-amber-400" : "text-muted-foreground"}`}>
                  {s.limit == null ? `${s.used} used` : `${Math.min(s.used, s.limit)} of ${s.limit}`}
                </span>
              </div>
              {s.limit != null && (
                <Progress value={Math.min(100, (s.used / s.limit) * 100)} className={`mt-2.5 h-1 ${s.state === "out" ? "[&>[data-slot=progress-indicator]]:bg-amber-400" : ""}`} />
              )}
            </div>
          ))}
        </div>
      </Row>

      {!pro && (
        <>
          <Separator className="my-8" />
          <Row title="Compare plans" description="Editing, checks and downloads are free on both, always.">
            <div className="overflow-hidden rounded-xl border border-border bg-card text-sm">
              <div className="grid grid-cols-[1fr_5.5rem_5.5rem] gap-x-3 border-b border-border px-5 py-2.5 text-xs text-muted-foreground">
                <span />
                <span className="text-right">Free</span>
                <span className="text-right text-foreground">Pro</span>
              </div>
              {PLAN_ROWS.map((r) => (
                <div key={r.title} className="grid grid-cols-[1fr_5.5rem_5.5rem] gap-x-3 border-b border-border px-5 py-3 last:border-b-0">
                  <span>{r.title}</span>
                  <span className="text-right text-muted-foreground">{r.free}</span>
                  <span className="text-right">{r.pro}</span>
                </div>
              ))}
            </div>
          </Row>
        </>
      )}

      <Separator className="my-8" />

      <Row title="Good to know" description="The terms, in plain words.">
        <dl className="divide-y divide-border rounded-xl border border-border bg-card text-sm">
          <Term label="Cancelling">Monthly cancels in one click here. You keep Pro until the end of the month you paid for. The pass just ends.</Term>
          <Term label="Your work">Going back to Free never deletes anything. Every resume and downloaded PDF stays.</Term>
          <Term label="Payments">Handled by Dodo Payments. We never see or store your card.</Term>
          <Term label="Refunds">Payments aren&apos;t refunded, so it&apos;s worth trying Free first.</Term>
          <Term label="Questions">
            Email <a href="mailto:dev@rusil.me" className="text-foreground underline-offset-4 hover:underline">dev@rusil.me</a>
            {email ? <>. Receipts go to {email}.</> : "."}
          </Term>
        </dl>
      </Row>
    </div>
  )
}

function Row({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 md:grid-cols-[13rem_1fr] md:gap-10">
      <div>
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

function Term({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 px-5 py-3.5 sm:grid-cols-[7rem_1fr] sm:gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

// Portal, cancel, keep and extend for a paying user.
function ProActions({ billing }: { billing: Billing }) {
  const router = useRouter()
  const [busy, setBusy] = useState<"portal" | "cancel" | "keep" | null>(null)
  const monthly = billing.source === "monthly"

  async function run(kind: NonNullable<typeof busy>, call: () => Promise<ActionResult>, done: string) {
    setBusy(kind)
    const res = await call()
    setBusy(null)
    if (!res.ok) return void toast.error(res.error)
    toast.success(done)
    router.refresh()
  }

  async function portal() {
    setBusy("portal")
    const res = await openBillingPortal()
    if (!res.ok) {
      setBusy(null)
      return void toast.error(res.error)
    }
    window.location.href = res.data.url
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={billing.pastDue ? "default" : "outline"} disabled={!!busy} onClick={portal}>
          {busy === "portal" ? <Spinner /> : billing.pastDue ? <AlertTriangle /> : null}
          {billing.pastDue ? "Update card" : monthly ? "Manage billing" : "Receipts"} {busy !== "portal" && <ArrowUpRight className="opacity-60" />}
        </Button>
        {monthly && billing.cancelAtPeriodEnd && (
          <Button size="sm" disabled={!!busy} onClick={() => run("keep", () => setCancelAtPeriodEnd(false), "You're staying on Pro. It renews as usual.")}>
            {busy === "keep" && <Spinner />} Keep Pro
          </Button>
        )}
        {!monthly && (
          <UpgradeDialog reason="Add another 90 days of Pro, or switch to monthly.">
            <Button size="sm">Extend Pro</Button>
          </UpgradeDialog>
        )}
      </div>
      {monthly && !billing.cancelAtPeriodEnd && (
        <CancelDialog periodEnd={billing.periodEnd} busy={busy === "cancel"} onConfirm={() => run("cancel", () => setCancelAtPeriodEnd(true), `Cancelled. Pro stays on until ${date(billing.periodEnd)}.`)} />
      )}
    </>
  )
}

function CancelDialog({ periodEnd, busy, onConfirm }: { periodEnd: string; busy: boolean; onConfirm: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive">Cancel plan</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Cancel Pro?</DialogTitle>
          <DialogDescription>
            You keep Pro until {date(periodEnd)}, then move to Free. You won&apos;t be charged again, and you can undo this until then. Payments aren&apos;t refunded.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Keep Pro</Button>
          <Button variant="destructive" disabled={busy} onClick={async () => { await onConfirm(); setOpen(false) }}>{busy && <Spinner />} Cancel plan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { AlertTriangle, Check, CreditCard, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { UpgradeDialog } from "@/components/app/upgrade-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import { openBillingPortal, setCancelAtPeriodEnd } from "@/lib/plan-actions"
import type { ActionResult } from "@/lib/record/actions"
import { ALLOWANCE_LABELS, allowanceStates, PLANS, PRO_PRICE, type AllowanceState, type PlanUsage } from "@/lib/plans"

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}

// The line that makes the gap concrete, worst allowance first.
function upgradeReason(states: AllowanceState[]): string | undefined {
  const worst = states.find((s) => s.state === "out") ?? states.find((s) => s.state === "low")
  if (!worst) return undefined
  const { units, unit } = ALLOWANCE_LABELS[worst.key]
  return worst.state === "out"
    ? `You've used all ${worst.limit} free ${units} this month.`
    : `Only ${plural(worst.left!, unit, units)} left on Free this month.`
}

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

      {usage.billing && <ProBilling billing={usage.billing} />}

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

function day(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// What Pro costs them and until when, plus cancel, keep and billing.
function ProBilling({ billing }: { billing: NonNullable<PlanUsage["billing"]> }) {
  const router = useRouter()
  const [busy, setBusy] = useState<"portal" | "cancel" | "keep" | null>(null)
  const monthly = billing.source === "monthly"
  const line =
    billing.source === "pass"
      ? `3-month pass. Pro until ${day(billing.periodEnd)}, then back to Free. Never renews.`
      : billing.pastDue
        ? `Your last payment didn't go through. Update your card by ${day(billing.periodEnd)} to keep Pro.`
        : billing.cancelAtPeriodEnd
          ? `Cancelled. You keep Pro until ${day(billing.periodEnd)}, then you're on Free.`
          : `$${PRO_PRICE.monthly} a month. Renews ${day(billing.periodEnd)}.`

  async function run<T>(kind: NonNullable<typeof busy>, call: () => Promise<ActionResult<T>>, done: (data: T) => void) {
    setBusy(kind)
    const res = await call()
    setBusy(null)
    if (!res.ok) return void toast.error(res.error)
    done(res.data)
    router.refresh()
  }

  async function manage() {
    setBusy("portal")
    const res = await openBillingPortal()
    if (!res.ok) {
      setBusy(null)
      return void toast.error(res.error)
    }
    window.location.href = res.data.url
  }

  return (
    <div className="border-t border-border p-5">
      <p className={`flex gap-2 text-sm ${billing.pastDue ? "text-amber-400" : "text-muted-foreground"}`}>
        {billing.pastDue && <AlertTriangle className="mt-0.5 size-4 shrink-0" />} {line}
      </p>
      <div className="mt-4 flex flex-col gap-2">
        {billing.source === "pass" && (
          <UpgradeDialog reason="Add another 90 days of Pro to your pass, or switch to monthly.">
            <Button className="w-full rounded-full"><Sparkles /> Extend Pro</Button>
          </UpgradeDialog>
        )}
        {monthly && billing.cancelAtPeriodEnd && (
          <Button className="w-full rounded-full" disabled={!!busy} onClick={() => run("keep", () => setCancelAtPeriodEnd(false), () => toast.success("You're staying on Pro. It renews as usual."))}>
            {busy === "keep" ? <Spinner /> : <Sparkles />} Keep Pro
          </Button>
        )}
        <Button variant={billing.pastDue ? "default" : "outline"} className="w-full rounded-full" onClick={manage} disabled={!!busy}>
          {busy === "portal" ? <Spinner /> : <CreditCard />} {billing.source === "pass" ? "Receipts and billing" : billing.pastDue ? "Update card" : "Manage billing"}
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
        {monthly && !billing.cancelAtPeriodEnd && (
          <Confirm
            title="Cancel Pro?"
            body={`You keep Pro until ${day(billing.periodEnd)}, then you're on Free. You won't be charged again, and you can change your mind until then. Payments aren't refunded.`}
            confirm="Cancel plan"
            busy={busy === "cancel"}
            onConfirm={() => run("cancel", () => setCancelAtPeriodEnd(true), () => toast.success(`Cancelled. Pro stays on until ${day(billing.periodEnd)}.`))}
          >
            <button type="button" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Cancel plan</button>
          </Confirm>
        )}
      </div>
    </div>
  )
}

function Confirm({ title, body, confirm, busy, onConfirm, children }: { title: string; body: string; confirm: string; busy: boolean; onConfirm: () => Promise<void> | void; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Never mind</Button>
          <Button variant="destructive" disabled={busy} onClick={async () => { await onConfirm(); setOpen(false) }}>
            {busy && <Spinner />} {confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

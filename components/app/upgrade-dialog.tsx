"use client"

import Link from "next/link"
import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import { Check, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { startCheckout } from "@/lib/plan-actions"
import { PRO_PRICE } from "@/lib/plans"

const PERKS = ["Unlimited tailored resumes, each with a match report", "Unlimited AI fixes and chat edits", "Sync GitHub and LinkedIn anytime", "Your full download history"]

const OPTIONS = [
  { id: "pass" as const, name: "3 months", price: PRO_PRICE.pass, unit: "once", note: "A 90-day pass. Never renews.", tag: `Save $${PRO_PRICE.monthly * 3 - PRO_PRICE.pass}` },
  { id: "monthly" as const, name: "Monthly", price: PRO_PRICE.monthly, unit: "/ month", note: "Renews monthly. Cancel anytime.", tag: null },
]

// `reason` is the one line that explains why this person is seeing the upgrade right now,
// e.g. "You've used 2 of your 3 free tailored resumes this month." Opened by its trigger
// (`children`), or controlled with `open` when there is no button (see upgrade-prompt.tsx).
export function UpgradeDialog({ reason, children, open, onOpenChange }: { reason?: string; children?: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const { user } = useUser()
  const [billing, setBilling] = useState<"monthly" | "pass">("pass")
  const [busy, setBusy] = useState(false)
  const [joined, setJoined] = useState(false)
  const email = user?.primaryEmailAddress?.emailAddress

  // Off to Dodo's hosted checkout. Before billing keys exist, the action joins the Pro list instead.
  async function upgrade() {
    setBusy(true)
    const res = await startCheckout(billing)
    if (!res.ok) {
      setBusy(false)
      return void toast.error(res.error)
    }
    if ("url" in res.data) return void (window.location.href = res.data.url)
    setBusy(false)
    setJoined(true)
  }

  const chosen = OPTIONS.find((o) => o.id === billing)!

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="gap-0 p-0 sm:max-w-md">
        <DialogHeader className="px-6 pt-6 text-left">
          <DialogTitle className="text-lg font-semibold">Upgrade to Pro</DialogTitle>
          <DialogDescription>{reason ?? "For an active job search: a resume aimed at every job you apply to."}</DialogDescription>
        </DialogHeader>

        {joined ? (
          <div className="m-6 flex items-start gap-3 rounded-xl bg-card p-4 text-sm">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
            <p>
              <span className="font-medium">You&apos;re on the Pro list.</span>{" "}
              <span className="text-muted-foreground">We&apos;ll email {email ?? "you"} the moment you can switch it on.</span>
            </p>
          </div>
        ) : (
          <>
            <RadioGroup value={billing} onValueChange={(v) => setBilling(v as "monthly" | "pass")} className="grid grid-cols-2 gap-3 px-6 pt-5" aria-label="Billing">
              {OPTIONS.map((o) => (
                <label
                  key={o.id}
                  htmlFor={`plan-${o.id}`}
                  className={`relative cursor-pointer rounded-lg border p-3.5 transition-colors ${billing === o.id ? "border-foreground/60 bg-muted/40" : "border-border hover:border-foreground/25"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium whitespace-nowrap">{o.name}</span>
                    <RadioGroupItem id={`plan-${o.id}`} value={o.id} />
                  </div>
                  <p className="mt-2">
                    <span className="text-2xl font-semibold tracking-tight tabular-nums">${o.price}</span>
                    <span className="ml-1 text-sm text-muted-foreground">{o.unit}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{o.note}</p>
                  {o.tag && <span className="absolute -top-2 right-3 rounded-full bg-secondary px-1.5 text-[11px] text-muted-foreground">{o.tag}</span>}
                </label>
              ))}
            </RadioGroup>

            <ul className="space-y-2 px-6 pt-5 text-sm">
              {PERKS.map((p) => (
                <li key={p} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" /> {p}
                </li>
              ))}
            </ul>

            <div className="mt-6 border-t border-border px-6 py-4">
              <Button className="w-full" onClick={upgrade} disabled={busy}>
                {busy && <Spinner />} Continue to checkout · ${chosen.price}
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Checkout by Dodo Payments. No refunds.{" "}
                <Link href="/pricing" target="_blank" className="underline-offset-4 hover:text-foreground hover:underline">Compare plans</Link>
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

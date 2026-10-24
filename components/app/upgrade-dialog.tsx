"use client"

import Link from "next/link"
import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import { CheckCircle2, FileStack, History, Lock, RefreshCw, Sparkles, Target, Wand2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { startCheckout } from "@/lib/plan-actions"
import { PLANS, PRO_PRICE } from "@/lib/plans"

const free = PLANS.free.limits

// Free next to Pro on every line, so the difference is concrete rather than a feature list.
const ROWS = [
  { icon: FileStack, title: "Tailored resumes", free: `${free.tailored} a month`, pro: "Unlimited" },
  { icon: Target, title: "Match report for each job", free: `${free.tailored} a month`, pro: "Every job" },
  { icon: Wand2, title: "AI fixes and chat edits", free: `${free.fixes} a month`, pro: "Unlimited" },
  { icon: RefreshCw, title: "GitHub and LinkedIn syncs", free: `${free.updates} a month`, pro: "Anytime" },
  { icon: History, title: "What you sent where", free: "Last 3", pro: "Forever" },
]

// `reason` is the one line that explains why this person is seeing the upgrade right now,
// e.g. "You've used 2 of your 3 free tailored resumes this month."
export function UpgradeDialog({ reason, children }: { reason?: string; children: React.ReactNode }) {
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

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <div className="relative border-b border-border bg-[radial-gradient(80%_100%_at_50%_0%,rgba(255,255,255,0.08),transparent)] px-6 pt-6 pb-5">
          <DialogHeader>
            <Badge variant="outline" className="mb-2 w-fit gap-1.5 rounded-full border-white/15 bg-white/[0.04] font-normal">
              <Sparkles className="size-3" /> Pro
            </Badge>
            <DialogTitle className="text-2xl font-semibold tracking-tight">A tailored resume for every job</DialogTitle>
            <DialogDescription className="text-[15px]">
              {reason ?? "Free gets you a great resume. Pro gets you one aimed at every job you apply to."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-5">
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 gap-y-3 text-sm">
            <span />
            <span className="w-20 text-right text-xs text-muted-foreground">Free</span>
            <span className="w-20 text-right text-xs font-medium">Pro</span>
            {ROWS.map(({ icon: Icon, title, free, pro }) => (
              <div key={title} className="contents">
                <span className="flex items-center gap-2.5">
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  {title}
                </span>
                <span className="w-20 text-right text-muted-foreground">{free}</span>
                <span className="w-20 text-right font-medium">{pro}</span>
              </div>
            ))}
          </div>

          {joined ? (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4 text-sm">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
              <p>
                <span className="font-medium">You&apos;re on the Pro list.</span>{" "}
                <span className="text-muted-foreground">Pro is opening soon. We&apos;ll email {email ?? "you"} the moment you can switch it on.</span>
              </p>
            </div>
          ) : (
            <>
              <div className="mt-6 flex items-center justify-between gap-3">
                <Tabs value={billing} onValueChange={(v) => setBilling(v as "monthly" | "pass")}>
                  <TabsList className="rounded-full">
                    <TabsTrigger value="monthly" className="rounded-full px-3">Monthly</TabsTrigger>
                    <TabsTrigger value="pass" className="rounded-full px-3">3-month pass</TabsTrigger>
                  </TabsList>
                </Tabs>
                <p className="text-right">
                  <span className="text-2xl font-semibold tracking-tight tabular-nums">${billing === "pass" ? PRO_PRICE.pass : PRO_PRICE.monthly}</span>
                  <span className="text-sm text-muted-foreground">{billing === "pass" ? " / 3 months" : " / month"}</span>
                </p>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {billing === "pass" ? "One payment. Ends after 90 days and never renews." : "Renews monthly. Cancel anytime in one click."} Lower prices in many countries.
              </p>
              <Button size="lg" className="mt-5 h-11 w-full rounded-full" onClick={upgrade} disabled={busy}>
                {busy ? <Spinner /> : <Sparkles />} Upgrade to Pro
              </Button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                <Lock className="size-3" /> Secure checkout by Dodo Payments. Payments aren&apos;t refunded.
              </p>
            </>
          )}
          <p className="mt-4 text-center text-xs">
            <Link href="/pricing" target="_blank" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Compare plans</Link>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

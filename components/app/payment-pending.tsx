"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Sparkles } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"

const TRIES = 12
const EVERY_MS = 5000

// After checkout the return URL proves nothing; Pro is on only once the payment webhook has
// arrived. Re-check for a minute, then say what to do instead of "refresh and hope".
export function PaymentPending({ pro }: { pro: boolean }) {
  const router = useRouter()
  const [tries, setTries] = useState(0)

  useEffect(() => {
    if (pro || tries >= TRIES) return
    const t = setTimeout(() => {
      router.refresh()
      setTries((n) => n + 1)
    }, EVERY_MS)
    return () => clearTimeout(t)
  }, [pro, tries, router])

  if (pro) {
    return (
      <Banner tone="ok">
        <span className="font-medium">You&apos;re on Pro.</span> <span className="text-muted-foreground">Tailor a resume for every job you apply to.</span>
      </Banner>
    )
  }
  if (tries < TRIES) {
    return (
      <Banner tone="wait">
        <span className="font-medium">Checking your payment…</span> <span className="text-muted-foreground">Pro switches on as soon as the payment provider confirms it, usually within a minute.</span>
      </Banner>
    )
  }
  return (
    <Banner tone="warn">
      <span className="font-medium">We haven&apos;t received a payment confirmation yet.</span>{" "}
      <span className="text-muted-foreground">
        If you completed checkout, it can take a few minutes.{" "}
        <button type="button" className="text-foreground underline underline-offset-4" onClick={() => setTries(0)}>Check again</button>, or email{" "}
        <a href="mailto:dev@rusil.me" className="text-foreground underline underline-offset-4">dev@rusil.me</a> with your receipt and we&apos;ll switch it on.
      </span>
    </Banner>
  )
}

function Banner({ tone, children }: { tone: "ok" | "wait" | "warn"; children: React.ReactNode }) {
  const color = tone === "ok" ? "border-emerald-400/20 bg-emerald-400/[0.06]" : tone === "warn" ? "border-amber-400/20 bg-amber-400/[0.06]" : "border-border bg-card"
  return (
    <div role="status" className={`flex items-start gap-3 rounded-2xl border px-5 py-4 text-sm ${color}`}>
      {tone === "wait" ? <Spinner className="mt-0.5 size-4 shrink-0" /> : <Sparkles className={`mt-0.5 size-4 shrink-0 ${tone === "ok" ? "text-emerald-400" : "text-amber-400"}`} />}
      <p>{children}</p>
    </div>
  )
}

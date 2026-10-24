"use client"

import { useEffect, useState } from "react"
import { UpgradeDialog } from "@/components/app/upgrade-dialog"

// When a server action says a Free allowance ran out, any component can open the Pro dialog with
// the reason, instead of showing a plain error. One host, mounted in the app layout, renders it.

type Listener = (reason: string) => void
const listeners = new Set<Listener>()

export function promptUpgrade(reason: string) {
  listeners.forEach((l) => l(reason))
}

// True when the result was an allowance stop (and the dialog was opened).
export function offerUpgrade(res: { ok: boolean; error?: string; upgrade?: string }): boolean {
  if (res.ok || !res.upgrade) return false
  promptUpgrade(res.error ?? "")
  return true
}

export function UpgradeHost() {
  const [reason, setReason] = useState<string | null>(null)
  useEffect(() => {
    listeners.add(setReason)
    return () => void listeners.delete(setReason)
  }, [])
  return <UpgradeDialog open={reason != null} onOpenChange={(o) => !o && setReason(null)} reason={reason ?? undefined} />
}

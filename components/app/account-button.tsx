"use client"

import { useSyncExternalStore } from "react"
import { UserButton } from "@clerk/nextjs"

// Clerk's UserButton mounts its own container in the browser, so the server HTML never matches
// it. Render it after hydration, with a same-size placeholder so nothing shifts.
export function AccountButton() {
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)
  return mounted ? <UserButton /> : <span className="inline-block size-7 rounded-full bg-secondary" aria-hidden="true" />
}

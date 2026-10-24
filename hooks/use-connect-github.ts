"use client"

import { useState } from "react"
import { useReverification, useUser } from "@clerk/nextjs"
import { isReverificationCancelledError } from "@clerk/nextjs/errors"
import { toast } from "sonner"

// Links GitHub to the signed-in account through Clerk, so a Google or email sign-in still gets the
// user's own token (5,000 req/hr, as them). GitHub sends them back to `returnPath?github=connected`.
export function useConnectGitHub(returnPath: string) {
  const { user } = useUser()
  const [connecting, setConnecting] = useState(false)
  // Linking an account is a sensitive action: Clerk asks for a fresh sign-in check first,
  // shows its own verify dialog when needed, then retries.
  const link = useReverification(async (redirectUrl: string) => {
    const existing = user!.externalAccounts.find((a) => a.provider === "github")
    return existing ? existing.reauthorize({ redirectUrl }) : user!.createExternalAccount({ strategy: "oauth_github", redirectUrl })
  })

  async function connect() {
    if (!user) return
    setConnecting(true)
    try {
      const account = await link(`${window.location.origin}${returnPath}${returnPath.includes("?") ? "&" : "?"}github=connected`)
      const next = account.verification?.externalVerificationRedirectURL
      if (!next) throw new Error("GitHub didn't return a sign-in link")
      window.location.href = next.href
    } catch (err) {
      setConnecting(false)
      if (isReverificationCancelledError(err)) return
      const clerkMessage = (err as { errors?: { longMessage?: string; message?: string }[] }).errors?.[0]
      toast.error(clerkMessage?.longMessage ?? clerkMessage?.message ?? (err instanceof Error ? err.message : "Couldn't connect GitHub"))
    }
  }

  // Why the last link attempt failed (e.g. that GitHub account already belongs to another user).
  function failureReason(): string | null {
    const error = user?.externalAccounts.find((a) => a.provider === "github")?.verification?.error
    return error?.longMessage ?? error?.message ?? null
  }

  return { connect, connecting, ready: Boolean(user), failureReason }
}

"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

// Supabase rejecting the Clerk token is the most likely setup mistake, so explain that case.
const AUTH_ERROR = /suitable key|JWT|JWS|role .* does not exist|PGRST30/i

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const authSetup = AUTH_ERROR.test(error.message)
  return (
    <Alert className="mx-auto max-w-xl">
      <AlertTitle>{authSetup ? "The database doesn't accept your sign-in yet" : "Something went wrong"}</AlertTitle>
      <AlertDescription className="space-y-3">
        {authSetup ? (
          <p>
            Supabase can&apos;t verify Clerk&apos;s session token. In Supabase, add Clerk under Authentication → Sign In / Providers →
            Third-Party Auth, using your Clerk domain. In Clerk, turn on Integrations → Supabase so tokens carry the
            &quot;authenticated&quot; role.
          </p>
        ) : (
          <p>{error.message}</p>
        )}
        <Button size="sm" variant="secondary" onClick={reset}>Try again</Button>
      </AlertDescription>
    </Alert>
  )
}

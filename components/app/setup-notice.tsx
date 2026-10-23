import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function SetupNotice() {
  return (
    <Alert className="mx-auto max-w-xl">
      <AlertTitle>Database not connected</AlertTitle>
      <AlertDescription>
        <p>
          Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> in{" "}
          <code>.env.local</code>, run <code>supabase/migrations/0001_init.sql</code>, and add Clerk as a Third-Party
          Auth provider in Supabase. See <code>docs/IMPLEMENTATION.md</code> Milestone 0.
        </p>
      </AlertDescription>
    </Alert>
  )
}

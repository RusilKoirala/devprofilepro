import Link from "next/link"
import { Show } from "@clerk/nextjs"
import { AccountButton } from "@/components/app/account-button"
import { Button } from "@/components/ui/button"

// Signed out: sign in / sign up. Signed in: go to the app.
export function NavAuth() {
  return (
    <>
      <Show when="signed-out">
        <Button asChild size="sm" variant="ghost" className="rounded-full text-foreground/70 hover:text-foreground">
          <Link href="/sign-in">Sign in</Link>
        </Button>
        <Button asChild size="sm" variant="secondary" className="rounded-full px-4">
          <Link href="/sign-up">Sign up</Link>
        </Button>
      </Show>
      <Show when="signed-in">
        <Button asChild size="sm" variant="secondary" className="rounded-full px-4">
          <Link href="/home">Dashboard</Link>
        </Button>
        <AccountButton />
      </Show>
    </>
  )
}

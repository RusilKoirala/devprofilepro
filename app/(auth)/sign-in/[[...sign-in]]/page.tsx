import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-16">
      <SignIn fallbackRedirectUrl="/home" />
    </main>
  )
}

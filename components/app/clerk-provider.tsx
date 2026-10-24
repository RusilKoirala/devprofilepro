import { ClerkProvider } from "@clerk/nextjs"
import { shadcn } from "@clerk/ui/themes"

// Only the app and auth pages use Clerk, so the landing page works without Clerk keys.
// The shadcn theme reads our CSS variables (app/globals.css), so Clerk follows light and dark with the rest of the app.
export function AppClerkProvider({ children }: { children: React.ReactNode }) {
  return <ClerkProvider appearance={{ theme: shadcn }} signInUrl="/sign-in" signUpUrl="/sign-up" signInFallbackRedirectUrl="/home" signUpFallbackRedirectUrl="/home">{children}</ClerkProvider>
}

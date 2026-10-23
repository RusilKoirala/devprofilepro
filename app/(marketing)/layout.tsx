import { Navbar } from "@/components/marketing/navbar"
import { Footer } from "@/components/marketing/footer"
import { NavAuth } from "@/components/marketing/nav-auth"
import { AppClerkProvider } from "@/components/app/clerk-provider"
import { isAppEnabled } from "@/lib/access"

// Clerk only wraps the landing page when its keys are set, so the page never breaks without them.
const clerkConfigured = isAppEnabled() && Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY)

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const page = (
    <>
      <Navbar auth={clerkConfigured ? <NavAuth /> : undefined} />
      <main>{children}</main>
      <Footer />
    </>
  )
  return clerkConfigured ? <AppClerkProvider>{page}</AppClerkProvider> : page
}

import { notFound } from "next/navigation"
import { AppClerkProvider } from "@/components/app/clerk-provider"
import { isAppEnabled } from "@/lib/access"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  if (!isAppEnabled()) notFound()
  return <AppClerkProvider>{children}</AppClerkProvider>
}

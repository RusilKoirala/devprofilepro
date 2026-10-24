import { currentUser } from "@clerk/nextjs/server"
import { BillingView } from "@/components/app/billing-view"
import { createClient } from "@/lib/supabase/server"
import { loadPlanUsage } from "@/lib/usage"

export const metadata = { title: "Plan & billing · DevProfile" }

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ upgraded?: string }> }) {
  const { upgraded } = await searchParams
  const [user, usage] = await Promise.all([currentUser(), loadPlanUsage(await createClient())])
  return <BillingView usage={usage} email={user?.primaryEmailAddress?.emailAddress} upgraded={!!upgraded} />
}

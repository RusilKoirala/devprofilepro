import { currentUser } from "@clerk/nextjs/server"
import { StartForm } from "@/components/app/start-form"
import { createClient } from "@/lib/supabase/server"
import { aiProvider } from "@/lib/ai/model"

export const metadata = { title: "Add sources · DevProfile" }
// Building a resume runs several Claude calls in one server action.
export const maxDuration = 300

export default async function StartPage() {
  const [user, supabase] = await Promise.all([currentUser(), createClient()])
  const githubLogin = user?.externalAccounts.find((a) => a.provider.includes("github"))?.username ?? null
  const [{ data: sources, error: sourcesError }, { count, error: itemsError }] = await Promise.all([
    supabase.from("sources").select("id,kind,label,status,fetched_at").order("fetched_at", { ascending: false }),
    supabase.from("items").select("id", { count: "exact", head: true }),
  ])
  if (sourcesError || itemsError) throw new Error(sourcesError?.message ?? itemsError?.message)
  const provider = aiProvider() === "openai" ? "OpenAI" : aiProvider() === "anthropic" ? "Anthropic (Claude)" : "your configured AI provider"

  return (
    <div className="mx-auto max-w-3xl pt-4">
      <h2 className="text-lg font-medium">Give us what you have</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Any one of these is enough for a first draft. Every line we write links back to where it came from.
      </p>
      <StartForm githubLogin={githubLogin} sources={sources ?? []} hasRecord={Boolean(count)} />
      <p className="mt-8 text-xs text-muted-foreground">
        Your files are processed by {provider} to extract facts. Everything is private in your account.
      </p>
    </div>
  )
}

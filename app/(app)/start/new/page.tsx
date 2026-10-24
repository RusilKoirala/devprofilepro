import { currentUser } from "@clerk/nextjs/server"
import { FirstResumeFlow } from "@/components/app/first-resume-flow"
import { aiProvider } from "@/lib/ai/model"

export const metadata = { title: "Your first resume · DevProfile" }
// Reading GitHub and writing the resume run several AI calls in server actions on this route.
export const maxDuration = 300

export default async function FirstResumePage() {
  const user = await currentUser()
  const githubLogin = user?.externalAccounts.find((a) => a.provider.includes("github") && a.verification?.status === "verified")?.username ?? null
  const provider = aiProvider() === "openai" ? "OpenAI" : aiProvider() === "anthropic" ? "Anthropic (Claude)" : "your configured AI provider"
  return <FirstResumeFlow githubLogin={githubLogin} provider={provider} />
}

import { redirect } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"
import { FirstResumeFlow, type Resume } from "@/components/app/first-resume-flow"
import { aiProvider } from "@/lib/ai/model"
import { interviewItems } from "@/lib/ai/interview"
import { loadRecord } from "@/lib/record/db"
import { itemTitle } from "@/lib/record/types"
import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "Your first resume · DevProfile" }
// Reading GitHub and writing the resume run several AI calls in server actions on this route.
export const maxDuration = 300

// The interview's own question kinds; the import only adds bare "ownership" and "conflict" ones.
const INTERVIEW_KINDS = new Set(["built", "users", "outcome", "challenge", "team"])

export default async function FirstResumePage() {
  const supabase = await createClient()
  const [user, record, { data: base }] = await Promise.all([currentUser(), loadRecord(supabase), supabase.from("resumes").select("id").eq("kind", "base").maybeSingle()])
  // Already built: the first-resume flow is done.
  if (base) redirect(`/resume/${base.id}`)

  // Every finished stage is saved, so a reload or a closed tab picks up after the last one.
  const read = record.sources.some((s) => s.status !== "failed")
  const found = record.items.some((i) => i.type !== "contact")
  const interviewed = record.questions.some((q) => INTERVIEW_KINDS.has(q.kind ?? "") || (q.kind === "ownership" && q.options.length > 0))
  const picked = new Set(interviewItems(record.items).map((i) => i.id))
  const titles = new Map(record.items.map((i) => [i.id, itemTitle(i)]))
  const open = record.questions.filter((q) => q.status === "open" && picked.has(q.item_id))
  const resume: Resume = !read ? null : !found ? { at: "extract" } : !interviewed ? { at: "interview-questions" } : open.length
    ? { at: "interview", cards: open.map((q) => ({ id: q.id, item_id: q.item_id, item_title: titles.get(q.item_id) ?? "", kind: q.kind ?? "", prompt: q.prompt, options: q.options ?? [] })) }
    : { at: "write" }

  const githubLogin = user?.externalAccounts.find((a) => a.provider.includes("github") && a.verification?.status === "verified")?.username ?? null
  const provider = aiProvider() === "openai" ? "OpenAI" : aiProvider() === "anthropic" ? "Anthropic (Claude)" : "your configured AI provider"
  return <FirstResumeFlow githubLogin={githubLogin} provider={provider} resume={resume} />
}

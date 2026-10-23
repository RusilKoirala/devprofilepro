import { redirect } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"
import { ResumeHome } from "@/components/app/resume-home"
import { loadRecord } from "@/lib/record/db"
import type { ResumeLayout } from "@/lib/record/types"
import { buildResume } from "@/lib/resume/build"
import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "Resumes · DevProfile" }
// Making a new resume runs an AI step from this page.
export const maxDuration = 300

function ago(date: string) {
  const mins = Math.round((Date.now() - new Date(date).getTime()) / 60000)
  if (mins < 60) return `${Math.max(1, mins)} min ago`
  if (mins < 60 * 24) return `${Math.round(mins / 60)} h ago`
  return new Date(date).toLocaleDateString()
}

export default async function ResumesPage() {
  const supabase = await createClient()
  const [user, record, { data: resumes, error }] = await Promise.all([
    currentUser(),
    loadRecord(supabase),
    supabase.from("resumes").select("id,kind,title,layout,updated_at").order("kind").order("updated_at", { ascending: false }),
  ])
  if (error) throw new Error(error.message)
  if (!resumes?.length) redirect("/start")

  const contactName = record.items.find((i) => i.type === "contact")?.data.name ?? ""
  const firstName = user?.firstName || contactName.split(/\s+/)[0] || ""

  return (
    <ResumeHome
      firstName={firstName}
      resumes={resumes.map((r) => ({
        id: r.id,
        title: r.kind === "base" ? "Base resume" : r.title,
        updated: ago(r.updated_at),
        doc: buildResume(r.layout as ResumeLayout, record),
      }))}
    />
  )
}

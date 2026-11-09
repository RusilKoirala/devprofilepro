import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { loadRecord, loadResume } from "@/lib/record/db"
import { buildResume } from "@/lib/resume/build"

export async function loadResumeDoc(supabase: SupabaseClient, resumeId: string) {
  const [resume, record] = await Promise.all([loadResume(supabase, resumeId), loadRecord(supabase)])
  if (!resume) return null
  return { resume, record, doc: buildResume(resume.layout, record) }
}

export function exportFilename(name: string, title: string, kind: "base" | "tailored") {
  const part = (s: string) => s.trim().replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "")
  const base = part(name) || "Resume"
  return kind === "tailored" ? `${base}_${part(title)}.pdf` : `${base}_Resume.pdf`
}

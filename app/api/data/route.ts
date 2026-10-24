import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const TABLES = ["sources", "source_versions", "items", "facts", "bullets", "questions", "jobs", "resumes", "exports"] as const

// "Download my data": every row the user owns, as JSON.
export async function GET() {
  const supabase = await createClient()
  const entries = await Promise.all(TABLES.map(async (table) => {
    // PostgREST caps a response at 1,000 rows by default. Page through all data
    // and report errors instead of returning a successful, incomplete backup.
    const rows: Record<string, unknown>[] = []
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase.from(table).select("*").order("id").range(offset, offset + 499)
      if (error) throw new Error(`Couldn't export ${table}: ${error.message}`)
      rows.push(...data)
      if (data.length < 500) break
    }
    return [table, rows] as const
  }))
  return new NextResponse(JSON.stringify({ exported_at: new Date().toISOString(), ...Object.fromEntries(entries) }, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="devprofile-data.json"', "Cache-Control": "private, no-store" },
  })
}

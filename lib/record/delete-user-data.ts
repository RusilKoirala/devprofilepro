import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"

// Every row and file DevProfile keeps for one user. Children before parents, so no foreign key
// blocks a delete. Billing records (subscriptions, billing_events) are kept for accounting.
// ai_runs isn't here: users can't delete it (it holds the daily spend budget), see scrubAiRuns.
const TABLES = ["exports", "chat_messages", "bullets", "questions", "facts", "resumes", "jobs", "items", "source_versions", "sources"]

async function removeFolder(supabase: SupabaseClient, bucket: string, folder: string) {
  for (;;) {
    const { data, error } = await supabase.storage.from(bucket).list(folder, { limit: 100 })
    if (error) throw new Error(error.message)
    if (!data?.length) return
    const { error: removeError } = await supabase.storage.from(bucket).remove(data.map((f) => `${folder}/${f.name}`))
    if (removeError) throw new Error(removeError.message)
    if (data.length < 100) return
  }
}

// `withUsage`: the account itself was deleted (Clerk webhook, service key). Also forget the monthly
// usage counts, the AI log and build passes. A user wiping their data keeps the counts, so it can't
// be used to reset Free allowances; their AI log is scrubbed instead (scrubAiRuns).
export async function deleteUserData(supabase: SupabaseClient, userId: string, { withUsage = false } = {}) {
  for (const table of [...TABLES, ...(withUsage ? ["ai_runs", "usage_events", "build_passes"] : [])]) {
    const { error } = await supabase.from(table).delete().eq("user_id", userId)
    if (error) throw new Error(`${table}: ${error.message}`)
  }
  await removeFolder(supabase, "uploads", userId)
  await removeFolder(supabase, "exports", userId)
}

// "Delete all my data" without resetting today's AI budget: runs from earlier days no longer count
// and go; today's keep only their cost. Needs the service key, since users can't change ai_runs.
export async function scrubAiRuns(admin: SupabaseClient, userId: string, now = new Date()) {
  const today = `${now.toISOString().slice(0, 10)}T00:00:00Z`
  const { error } = await admin.from("ai_runs").delete().eq("user_id", userId).lt("created_at", today)
  if (error) throw new Error(`ai_runs: ${error.message}`)
  const { data: runs, error: readError } = await admin.from("ai_runs").select("id,meta").eq("user_id", userId)
  if (readError) throw new Error(`ai_runs: ${readError.message}`)
  for (const run of runs ?? []) {
    const cost = Number((run.meta as { cost_usd?: number } | null)?.cost_usd ?? 0)
    const { error: updateError } = await admin.from("ai_runs").update({ meta: { cost_usd: cost } }).eq("id", run.id).eq("user_id", userId)
    if (updateError) throw new Error(`ai_runs: ${updateError.message}`)
  }
}

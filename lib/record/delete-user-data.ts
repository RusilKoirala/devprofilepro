import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"

// Every row and file DevProfile keeps for one user. Children before parents, so no foreign key
// blocks a delete. Billing records (subscriptions, billing_events) are kept for accounting.
const TABLES = ["exports", "chat_messages", "bullets", "questions", "facts", "resumes", "jobs", "items", "source_versions", "sources", "ai_runs"]

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

// `withUsage`: also forget the monthly usage counts. Only when the account itself is deleted;
// a user wiping their data keeps the counts, so it can't be used to reset Free allowances.
export async function deleteUserData(supabase: SupabaseClient, userId: string, { withUsage = false } = {}) {
  for (const table of [...TABLES, ...(withUsage ? ["usage_events"] : [])]) {
    const { error } = await supabase.from(table).delete().eq("user_id", userId)
    if (error) throw new Error(`${table}: ${error.message}`)
  }
  await removeFolder(supabase, "uploads", userId)
  await removeFolder(supabase, "exports", userId)
}

import "server-only"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { supabaseUrl } from "@/lib/supabase/server"

// Bypasses RLS. Only for webhooks (Dodo billing, Clerk account deletion), and for server code acting
// on the signed-in user's own rows that users can't write themselves: billing, build passes
// (lib/record/build-pass.ts) and scrubbing their AI log. Always filter by the id from auth().
// Never import this from a page or a server action that takes user input as a table filter.
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY
  if (!supabaseUrl || !key) throw new Error("Set SUPABASE_SECRET_KEY (Supabase → Project settings → API keys → Secret key).")
  return createSupabaseClient(supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

import "server-only"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { supabaseUrl } from "@/lib/supabase/server"

export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY
  if (!supabaseUrl || !key) throw new Error("Set SUPABASE_SECRET_KEY (Supabase → Project settings → API keys → Secret key).")
  return createSupabaseClient(supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

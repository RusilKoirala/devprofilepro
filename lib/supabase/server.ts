import "server-only"
import { auth } from "@clerk/nextjs/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { notFound } from "next/navigation"
import { isAppEnabled } from "@/lib/access"

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
export const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseKey)
}

export async function createClient() {
  if (!isAppEnabled()) notFound()
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase isn't configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.")
  }
  const { getToken } = await auth()
  return createSupabaseClient(supabaseUrl, supabaseKey, {
    accessToken: async () => (await getToken()) ?? null,
  })
}

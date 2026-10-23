"use client"

import { useSession } from "@clerk/nextjs"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { useMemo } from "react"

// Browser client that sends the Clerk session token, so RLS applies.
export function useSupabase() {
  const { session } = useSession()
  return useMemo(
    () =>
      createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
        { accessToken: async () => (await session?.getToken()) ?? null }
      ),
    [session]
  )
}

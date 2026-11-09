"use client"

import { useSession } from "@clerk/nextjs"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { useMemo } from "react"

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

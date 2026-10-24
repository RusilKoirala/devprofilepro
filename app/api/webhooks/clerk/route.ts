import { NextResponse, type NextRequest } from "next/server"
import { verifyWebhook } from "@clerk/nextjs/webhooks"
import { deleteUserData } from "@/lib/record/delete-user-data"
import { createAdminClient } from "@/lib/supabase/admin"

// Clerk calls this when an account changes. On user.deleted, everything DevProfile kept for that
// user goes too: rows, uploaded files and downloaded PDFs (billing records stay for accounting).
// The signature is checked with CLERK_WEBHOOK_SIGNING_SECRET before anything is read.
export async function POST(request: NextRequest) {
  let event: Awaited<ReturnType<typeof verifyWebhook>>
  try {
    event = await verifyWebhook(request)
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }
  if (event.type !== "user.deleted") return NextResponse.json({ ok: true, ignored: event.type })
  const userId = event.data.id
  if (!userId) return NextResponse.json({ error: "No user id" }, { status: 400 })
  try {
    // The user is gone, so there is no session: the service key, filtered to their id only.
    await deleteUserData(createAdminClient(), userId, { withUsage: true })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("clerk user.deleted cleanup failed", err)
    // A 500 makes Clerk retry the delivery.
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 })
  }
}

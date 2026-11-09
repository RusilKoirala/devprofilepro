import {NextResponse, type NextRequest} from "next/server"
import { verifyWebhook } from "@clerk/nextjs/webhooks"
import { deleteUserData } from "@/lib/record/delete-user-data"
   import { createAdminClient } from "@/lib/supabase/admin"


//clerk login thinnggy

export async function POST(request: NextRequest) {
  let event: Awaited<ReturnType<typeof verifyWebhook>>
  try {
    event= await verifyWebhook(request)
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }
  if (event.type !== "user.deleted") return NextResponse.json({ok: true, ignored: event.type})
  const userId=event.data.id
  if (!userId) return NextResponse.json({ error: "No user id" }, { status: 400 })
  try {
    // bye bye
    await deleteUserData(createAdminClient(), userId, { withUsage: true })
	    return NextResponse.json({ ok: true })    
  } catch ( err){
    console.error("clerk user.deleted cleanup failed", err)
    return NextResponse.json({ error: "Cleanup failed" },{ status: 500 })
  }

   }

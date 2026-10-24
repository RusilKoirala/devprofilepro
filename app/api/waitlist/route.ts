import { NextResponse } from "next/server"
import { z } from "zod"
import { addLoopsContact, LoopsError } from "@/lib/loops"

const BodySchema = z.object({
  email: z.email().max(254),
})

// Adds signups to Loops as contacts in the "waitlist" group, so the invite
// email can be sent from Loops later.
export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 })
  }
  try {
    await addLoopsContact(parsed.data.email, "waitlist", "landing-page")
    return NextResponse.json({ ok: true })
  } catch (err) {
    const status = err instanceof LoopsError ? err.status : 502
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't save your email." }, { status })
  }
}

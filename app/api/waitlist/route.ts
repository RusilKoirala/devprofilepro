import { NextResponse } from "next/server"
import { z } from "zod"

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

  const apiKey = process.env.LOOPS_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "The waitlist isn't connected yet. Set LOOPS_API_KEY." },
      { status: 503 }
    )
  }

  const res = await fetch("https://app.loops.so/api/v1/contacts/create", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: parsed.data.email.toLowerCase(),
      source: "landing-page",
      userGroup: "waitlist",
      subscribed: true,
    }),
  })

  // 409 means the email is already on the list; treat a repeat signup as success.
  if (res.ok || res.status === 409) {
    return NextResponse.json({ ok: true })
  }

  console.error("loops contact create failed", res.status, await res.text().catch(() => ""))
  return NextResponse.json({ error: "Couldn't save your email. Try again in a minute." }, { status: 502 })
}

import "server-only"

export class LoopsError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

// Adds (or keeps) a contact in a Loops user group, so emails can be sent to that group later.
// "waitlist" = early access signups, "pro" = people who asked to hear when Pro opens.
export async function addLoopsContact(email: string, userGroup: "waitlist" | "pro", source: string) {
  const apiKey = process.env.LOOPS_API_KEY
  if (!apiKey) throw new LoopsError("The mailing list isn't connected yet. Set LOOPS_API_KEY.", 503)

  const res = await fetch("https://app.loops.so/api/v1/contacts/create", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.toLowerCase(), source, userGroup, subscribed: true }),
  })
  // 409 means the email is already a contact; treat a repeat signup as success.
  if (res.ok || res.status === 409) return
  console.error("loops contact create failed", res.status, await res.text().catch(() => ""))
  throw new LoopsError("Couldn't save your email. Try again in a minute.", 502)
}

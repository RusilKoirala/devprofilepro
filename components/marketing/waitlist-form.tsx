"use client"

import { Check, Mail } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

export function WaitlistForm({ id, className }: { id: string; className?: string }) {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "saving" | "joined">("idle")

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus("saving")
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "Couldn't join the waitlist.")
      setStatus("joined")
      toast.success("You're on the waitlist", {
        description: `We'll email ${email} when your invite is ready.`,
      })
    } catch (error) {
      setStatus("idle")
      toast.error(error instanceof Error ? error.message : "Couldn't join the waitlist.")
    }
  }

  const joined = status === "joined"

  return (
    <form onSubmit={onSubmit} className={cn("w-full max-w-md", className)}>
      <Field>
        <FieldLabel htmlFor={id} className="sr-only">
          Email address
        </FieldLabel>
        <InputGroup className="h-12 rounded-full bg-background/60 pl-1.5 backdrop-blur">
          <InputGroupAddon>
            <Mail />
          </InputGroupAddon>
          <InputGroupInput
            id={id}
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            disabled={joined}
            onChange={(e) => setEmail(e.target.value)}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              type="submit"
              variant="default"
              size="sm"
              className="h-9 rounded-full px-4"
              disabled={status !== "idle"}
            >
              {status === "saving" && <Spinner />}
              {joined && <Check />}
              {joined ? "You're in" : "Join the waitlist"}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        <FieldDescription className="text-center">
          {joined
            ? "Thanks. One email when your invite is ready, nothing else."
            : "One email when your invite is ready. No newsletter."}
        </FieldDescription>
      </Field>
    </form>
  )
}

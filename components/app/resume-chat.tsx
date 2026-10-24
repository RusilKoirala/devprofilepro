"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { ArrowUp, CheckCircle2, MinusCircle } from "lucide-react"
import { offerUpgrade } from "@/components/app/upgrade-prompt"
import { LogoMark } from "@/components/marketing/logo"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { chatWithResume, clearChat, type ChatEditResult } from "@/lib/record/actions"

interface Message {
  role: "user" | "assistant"
  content: string
  edits?: ChatEditResult[]
  error?: boolean
}

// Enough recent turns for the model; older ones stay on screen only.
const SENT_TURNS = 12

const SUGGESTIONS = ["Shorten every line a little", "Move Skills to the top", "Lead each project with its impact", "Make it read better for backend roles"]

// What the model remembers of its own turns: the reply plus what code actually applied.
export function forModel(m: { role: "user" | "assistant"; content: string; edits?: ChatEditResult[] }) {
  if (m.role === "user" || !m.edits?.length) return m.content
  const done = m.edits.filter((e) => e.ok).map((e) => e.label)
  const skipped = m.edits.filter((e) => !e.ok).map((e) => `${e.label} (${e.reason})`)
  return [m.content, done.length && `Applied: ${done.join("; ")}`, skipped.length && `Skipped: ${skipped.join("; ")}`].filter(Boolean).join("\n")
}

// Talk to one resume. Each message is one AI call; code checks every edit and the page re-fits.
export interface ChatMessageView {
  role: "user" | "assistant"
  content: string
  edits?: ChatEditResult[]
}

// `initial`: this resume's saved conversation, loaded with the page, so it follows the person
// across reloads and devices.
export function ResumeChat({ resumeId, initial, onBusy }: { resumeId: string; initial: ChatMessageView[]; onBusy: (busy: boolean) => void }) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>(initial)
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, busy])

  async function send(value: string) {
    const content = value.trim()
    if (!content || busy) return
    const next: Message[] = [...messages, { role: "user", content }]
    setMessages(next)
    setText("")
    setBusy(true)
    onBusy(true)
    let res: Awaited<ReturnType<typeof chatWithResume>>
    try {
      res = await chatWithResume(resumeId, next.filter((m) => !m.error).slice(-SENT_TURNS).map((m) => ({ role: m.role, content: forModel(m) })))
    } catch {
      res = { ok: false, error: "We couldn't reach the server. Check your connection and send it again." }
    }
    setBusy(false)
    onBusy(false)
    if (!res.ok) {
      const error = res.error
      setText(content)
      offerUpgrade(res)
      return setMessages((all) => [...all, { role: "assistant", content: `${error} Your message is back in the box to send again.`, error: true }])
    }
    setMessages((all) => [...all, { role: "assistant", content: res.data.reply, edits: res.data.edits }])
    if (res.data.edits.some((e) => e.ok)) router.refresh()
    inputRef.current?.focus()
  }

  return (
    <div className="flex h-[calc(100svh-9.5rem)] min-h-[28rem] flex-col rounded-xl border border-border bg-card">
      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        {messages.length > 0 && !busy && (
          <div className="flex justify-end">
            <button type="button" onClick={() => { setMessages([]); void clearChat(resumeId) }} className="text-xs text-muted-foreground hover:text-foreground">Clear conversation</button>
          </div>
        )}
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <LogoMark className="size-8" />
            <div>
              <p className="font-medium">Tell me what to change</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">I edit this resume for you and you watch the page update. I only use your facts and what you tell me here.</p>
            </div>
            <div className="flex max-w-md flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-md bg-muted px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
            </div>
          ) : (
            <div key={i} className="flex gap-2.5">
              <LogoMark className="mt-0.5 size-5 shrink-0" />
              <div className="min-w-0 flex-1 space-y-2 text-sm leading-relaxed">
                <p className={m.error ? "text-destructive" : undefined}>{m.content}</p>
                {m.edits && <EditList edits={m.edits} />}
              </div>
            </div>
          )
        )}

        {busy && (
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <LogoMark className="size-5 shrink-0" />
            <Spinner /> Reading your resume and making the changes…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(text) }} className="border-t border-border p-3">
        <div className="flex items-end gap-2 rounded-xl border border-border bg-background px-3 py-2 transition-colors focus-within:border-foreground/25">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(text) }
            }}
            rows={1}
            maxLength={4000}
            placeholder="e.g. Shorten the Acme lines and move Projects above Experience"
            aria-label="Message about this resume"
            className="field-sizing-content max-h-40 min-h-6 flex-1 resize-none bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Button type="submit" size="icon" className="size-7 shrink-0 rounded-full" disabled={!text.trim() || busy} aria-label="Send">
            {busy ? <Spinner /> : <ArrowUp />}
          </Button>
        </div>
      </form>
    </div>
  )
}

// Each edit the chat tried: applied, or skipped with the reason.
export function EditList({ edits }: { edits: ChatEditResult[] }) {
  if (!edits.length) return null
  return (
    <ul className="space-y-1 border-l border-border pl-3">
      {edits.map((e, n) => (
        <li key={n} className="flex items-start gap-2 text-xs">
          {e.ok ? <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-400" /> : <MinusCircle className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />}
          <span className={e.ok ? "text-foreground/90" : "text-muted-foreground"}>
            {e.label}
            {!e.ok && e.reason && <span className="block">Skipped: {e.reason}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}

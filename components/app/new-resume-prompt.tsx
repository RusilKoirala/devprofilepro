"use client"

import { useRef, useState } from "react"
import { ArrowUp, Briefcase, Code2, Github } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

const SUGGESTIONS = [
  { icon: Briefcase, label: "Tailor it for a job post", text: "Tailor my resume for this job post:\n\n" },
  { icon: Code2, label: "A version for frontend roles", text: "Make a version of my resume aimed at frontend engineering roles." },
  { icon: Github, label: "Lead with my open source", text: "Make a version that leads with my open-source work and projects." },
]

export function NewResumePrompt({ onSubmit, busy = false, suggestions = true, placeholder }: {
  onSubmit: (text: string) => void
  busy?: boolean
  suggestions?: boolean
  placeholder?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [text, setText] = useState("")

  function submit() {
    const brief = text.trim()
    if (!brief || busy) return ref.current?.focus()
    onSubmit(brief)
    setText("")
  }

  function suggest(value: string) {
    setText(value)
    requestAnimationFrame(() => {
      const el = ref.current
      if (!el) return
      el.focus()
      el.setSelectionRange(value.length, value.length)
    })
  }

  return (
    <div className="w-full">
      <form
        onSubmit={(e) => { e.preventDefault(); submit() }}
        className="rounded-2xl border border-border bg-card shadow-sm transition-colors focus-within:border-foreground/25"
      >
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit() }
          }}
          rows={2}
          maxLength={20000}
          placeholder={placeholder ?? "Paste a job post, or say what this resume is for…"}
          aria-label="What is the new resume for?"
          className="field-sizing-content block max-h-72 min-h-16 w-full resize-none bg-transparent px-5 pt-4 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center justify-between gap-3 px-3 pt-1 pb-3">
          <span className="pl-2 text-xs text-muted-foreground">Picks from your Career Record only, and each line cites its source. Check the match before you send it.</span>
          <Button type="submit" size="icon" className="size-8 rounded-full" disabled={!text.trim() || busy} aria-label="Make this resume">
            {busy ? <Spinner /> : <ArrowUp />}
          </Button>
        </div>
      </form>
      {suggestions && (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map(({ icon: Icon, label, text: value }) => (
            <button
              key={label}
              type="button"
              onClick={() => suggest(value)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Icon className="size-3.5" /> {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

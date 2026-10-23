"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { answerQuestion } from "@/lib/record/actions"

export interface QuestionView {
  id: string
  prompt: string
  options: string[]
  item: string
}

// One impact question, shown inside the entry it improves. Answering rewrites only that entry.
export function QuestionCard({ resumeId, question, showItem = false }: { resumeId: string; question: QuestionView; showItem?: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [free, setFree] = useState("")

  function answer(value: string | null) {
    startTransition(async () => {
      const res = await answerQuestion(resumeId, question.id, value)
      if (!res.ok) return void toast.error(res.error)
      if (value) toast.success("Saved as “You told us” and rewrote this entry")
      router.refresh()
    })
  }

  return (
    <div id={`q-${question.id}`} data-attention className="scroll-mt-24 rounded-lg border border-primary/25 bg-primary/5 p-3">
      <p className="flex items-start gap-2 text-sm">
        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
        <span>
          {showItem && question.item && <span className="text-muted-foreground">{question.item}: </span>}
          {question.prompt}
        </span>
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pl-5.5">
        {question.options.length > 0 ? (
          question.options.map((o) => (
            <Button key={o} size="sm" variant="secondary" className="h-7" disabled={pending} onClick={() => answer(o)}>{o}</Button>
          ))
        ) : (
          <form className="flex w-full gap-2" onSubmit={(e) => { e.preventDefault(); answer(free) }}>
            <Input value={free} onChange={(e) => setFree(e.target.value)} placeholder="A sentence is plenty" className="h-8" />
            <Button size="sm" type="submit" disabled={pending || !free.trim()}>Save</Button>
          </form>
        )}
        <Button size="sm" variant="ghost" className="h-7 text-muted-foreground" disabled={pending} onClick={() => answer(null)}>Skip</Button>
        {pending && <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Spinner /> Rewriting…</span>}
      </div>
    </div>
  )
}

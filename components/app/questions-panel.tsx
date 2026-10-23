"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { answerQuestion } from "@/lib/record/actions"

export interface QuestionView {
  id: string
  prompt: string
  options: string[]
  item: string
}

export function QuestionsPanel({ resumeId, questions }: { resumeId: string; questions: QuestionView[] }) {
  if (!questions.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No open questions. Your answers are saved as facts labelled “You told us”.</p>
  }
  return (
    <div className="space-y-3">
      {questions.map((q) => <QuestionCard key={q.id} resumeId={resumeId} question={q} />)}
    </div>
  )
}

function QuestionCard({ resumeId, question }: { resumeId: string; question: QuestionView }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [free, setFree] = useState("")

  function answer(value: string | null) {
    startTransition(async () => {
      const res = await answerQuestion(resumeId, question.id, value)
      if (!res.ok) return void toast.error(res.error)
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardDescription>{question.item}</CardDescription>
        <CardTitle className="text-base leading-snug">{question.prompt}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        {question.options.length > 0 ? (
          question.options.map((o) => (
            <Button key={o} size="sm" variant="secondary" disabled={pending} onClick={() => answer(o)}>{o}</Button>
          ))
        ) : (
          <form className="flex w-full gap-2" onSubmit={(e) => { e.preventDefault(); answer(free) }}>
            <Input value={free} onChange={(e) => setFree(e.target.value)} placeholder="Your answer" />
            <Button size="sm" type="submit" disabled={pending || !free.trim()}>Save</Button>
          </form>
        )}
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => answer(null)}>Skip</Button>
        {pending && <Spinner className="text-muted-foreground" />}
      </CardContent>
    </Card>
  )
}

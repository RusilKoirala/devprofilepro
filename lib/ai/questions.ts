import "server-only"
import { z } from "zod"
import { generate, UNTRUSTED_NOTE } from "@/lib/ai/client"
import { recordForPrompt } from "@/lib/ai/record-prompt"
import type { Fact, Item } from "@/lib/record/types"

export const MAX_QUESTIONS = 5

const QuestionsSchema = z.object({
  questions: z.array(
    z.object({
      item_id: z.string(),
      prompt: z.string().describe("One short question in plain words"),
      options: z.array(z.string()).describe("2-5 answer choices; ranges stay ranges, e.g. '<100', '100-1k', '1k+'. Empty for free text."),
      kind: z.enum(["users", "speed", "team", "ownership", "outcome", "conflict"]),
    })
  ),
})

const SYSTEM = `You help a developer make their resume specific. Given their Career Record, ask at most ${MAX_QUESTIONS} short multiple-choice questions that would add the most missing evidence.

${UNTRUSTED_NOTE}

Priority:
1. Conflicts between sources (e.g. two different start dates for the same job).
2. On team projects: what did this person personally build?
3. How many people used it (offer ranges).
4. A measurable change (faster, cheaper, fewer errors) they can actually know.
5. Solo or team, when unclear.

Only ask about items that are shown. Never ask for something the facts already say. Options are honest ranges or choices; never force a precise number. The user can always skip.`

export async function generateQuestions(userId: string, items: Item[], facts: Fact[]) {
  const shown = items.filter((i) => i.status !== "hidden" && i.type !== "contact" && i.type !== "skills")
  if (!shown.length) return []
  const ids = new Set(shown.map((i) => i.id))
  const { questions } = await generate({
    step: "questions",
    userId,
    schema: QuestionsSchema,
    effort: "medium",
    maxTokens: 16000,
    system: SYSTEM,
    content: [{ type: "text", text: recordForPrompt(shown, facts) }],
    check: (out) => out.questions.filter((q) => !ids.has(q.item_id)).map((q) => `Question "${q.prompt}" uses unknown item_id ${q.item_id}`),
  })
  return questions.slice(0, MAX_QUESTIONS)
}

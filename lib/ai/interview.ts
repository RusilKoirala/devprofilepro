import "server-only"
import { z } from "zod"
import { generate, UNTRUSTED_NOTE } from "@/lib/ai/client"
import { recordForPrompt } from "@/lib/ai/record-prompt"
import type { Fact, Item, Question } from "@/lib/record/types"

// The interview runs before any bullet is written. Sources say what a project is;
// only the person can say what they built and what changed because of it.
export const MAX_INTERVIEW_ITEMS = 4
export const MAX_INTERVIEW_QUESTIONS = 8

// Kinds the UI answers with several picks plus free text, instead of one tap.
export const MULTI_KINDS = new Set(["built", "ownership"])

export const InterviewSchema = z.object({
  questions: z.array(
    z.object({
      item_id: z.string().describe("Exactly the id attribute of an <item>"),
      kind: z.enum(["built", "ownership", "users", "outcome", "challenge", "team"]),
      prompt: z.string().describe("One short question, under 12 words, naming the project or job"),
      options: z
        .array(z.string())
        .describe("2-6 short answer choices. For 'built'/'ownership': the parts of this project the facts mention (e.g. 'Auth and accounts', 'Payments with Stripe'). For 'users': honest ranges ('Just me', '<100', '100-1k', '1k+'). Empty only for 'challenge'."),
    })
  ),
})

const SYSTEM = `You interview a software developer for 60 seconds before their resume is written. Their sources tell us what each project or job is; they don't tell us what this person did or what changed because of it. Your questions get exactly that.

${UNTRUSTED_NOTE}

You get the entries to ask about (strongest first). For each entry, ask 1-2 questions, at most ${MAX_INTERVIEW_QUESTIONS} in total. Choose from:
- built: "What did you build in <name>?" Options are the concrete parts the facts mention (features, services, integrations). Use for solo projects.
- ownership: same as built, for team projects or jobs ("Which parts of <name> were yours?"). Always ask this for entries marked team.
- users: "How many people used <name>?" with honest ranges. Skip for jobs and for libraries with no users.
- outcome: "What changed because of your work on <name>?" with choices like "Faster", "Fewer bugs or errors", "Saved people time", "Made money", "Won or placed in a competition" — only ones that could plausibly apply.
- challenge: "Hardest problem you solved in <name>?" free text, no options. At most one on the whole interview, for the strongest entry.
- team: "Solo or team?" only when it's unclear and matters.

Rules:
- Never ask what the facts already answer. If a fact gives a user count, don't ask for users.
- Options are short (2-5 words), plain, and specific to that entry. Never invent features the facts don't hint at; when unsure, use fewer options.
- Plain friendly words, no jargon like "impact" or "metrics". Name the entry in each question.
- Don't repeat a question listed under <already_asked>.`

export interface InterviewQuestion {
  item_id: string
  kind: string
  prompt: string
  options: string[]
}

// The entries worth interviewing about: shown jobs and projects, strongest first.
export function interviewItems(items: Item[]): Item[] {
  return items
    .filter((i) => i.status !== "hidden" && (i.type === "project" || i.type === "job"))
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.rank - a.rank)
    .slice(0, MAX_INTERVIEW_ITEMS)
}

export async function generateInterview(userId: string, items: Item[], facts: Fact[], asked: Question[]): Promise<InterviewQuestion[]> {
  const picked = interviewItems(items)
  if (!picked.length) return []
  const ids = new Set(picked.map((i) => i.id))
  const askedText = asked.map((q) => `- ${q.prompt}`).join("\n")
  const { questions } = await generate({
    step: "questions",
    userId,
    schema: InterviewSchema,
    effort: "medium",
    maxTokens: 8000,
    system: SYSTEM,
    content: [
      { type: "text", text: recordForPrompt(picked, facts) },
      { type: "text", text: `Team entries: ${picked.filter((i) => i.data.team_project && !i.data.ownership_confirmed).map((i) => i.id).join(", ") || "none"}\n\n<already_asked>\n${askedText || "none"}\n</already_asked>` },
    ],
    check: (out) => out.questions.filter((q) => !ids.has(q.item_id)).map((q) => `Question "${q.prompt}" uses unknown item_id ${q.item_id}`),
  })
  return questions
    .filter((q) => ids.has(q.item_id))
    .map((q) => ({ ...q, options: q.kind === "challenge" ? [] : q.options.map((o) => o.trim()).filter(Boolean).slice(0, 6) }))
    .slice(0, MAX_INTERVIEW_QUESTIONS)
}

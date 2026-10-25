import "server-only"
import Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"
import { generate, UNTRUSTED_NOTE } from "@/lib/ai/client"
import { aiProvider, modelFor } from "@/lib/ai/model"
import { ITEM_TYPES, ItemDataSchema, type SourceRow } from "@/lib/record/types"

export const ExtractSchema = z.object({
  items: z.array(
    z.object({
      temp_id: z.string(),
      type: z.enum(ITEM_TYPES),
      data: ItemDataSchema,
      show: z.boolean(),
      rank: z.number().int().describe("1-100, how strong this is for a developer resume"),
      reason: z.string().describe("Short, specific reason for the rank and show/hide, e.g. 'Deployed, solo, real users' or 'Fork with no changes'"),
      team_project: z.boolean().describe("True if others contributed and it's unclear what this person built"),
      facts: z.array(
        z.object({
          text: z.string().describe("One true statement, in plain words"),
          source_id: z.string(),
          quote: z.string().describe("Exact excerpt copied word for word from that source"),
        })
      ),
    })
  ),
  section_order: z.array(z.enum(ITEM_TYPES)),
})
export type ExtractOutput = z.infer<typeof ExtractSchema>

const SYSTEM = `You read a software developer's sources (GitHub repos, old resume, LinkedIn export, notes) and build their Career Record: the jobs, projects, education, skills, awards and contact details that are actually supported by the sources.

${UNTRUSTED_NOTE}

Rules:
- Every fact needs a quote copied word for word from the source it came from (use the source's id). If you can't quote it, don't output the fact. Code checks every quote and drops any that aren't in the source.
- Keep dates exactly as written. Never guess a missing date.
- A school assignment, course project or bootcamp exercise is a project, never a job.
- On team repositories, never assume this person built everything; set team_project to true.
- Stars and popularity are context, not the deciding factor. A deployed project with real users or a clear technical problem ranks above a popular fork.
- Hide (show: false) forks with no commits by the user, empty repos, and plain tutorial clones, and say why in reason. Hidden items are kept; the user can show them.
- Merge duplicates: the same job in the resume and LinkedIn is one item with facts from both.
- Output one "contact" item if any contact details exist, and group skills into a few "skills" items by category (Languages, Frameworks, Tools). Only list skills the sources show.
- section_order: only the types you output. Skills, Experience, Education, Projects, Awards; with no jobs, Projects come right after Skills.`

// Fixed order so the packed block is stable for prompt caching.
const KIND_ORDER = ["resume_pdf", "linkedin_pdf", "paste", "pr_link", "github", "win"]

export function packSources(sources: SourceRow[]): string {
  const sorted = [...sources].sort((a, b) => {
    const k = KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)
    if (k) return k
    return Number(b.meta?.score ?? 0) - Number(a.meta?.score ?? 0) || a.id.localeCompare(b.id)
  })
  return sorted
    .map((s) => `<source id="${s.id}" kind="${s.kind}" label="${s.label.replace(/"/g, "'")}">\n${s.raw_text}\n</source>`)
    .join("\n\n")
}

// The building models read well past this; it keeps the cost of one build bounded (100k is about
// $0.40 of input on Opus or GPT-6.1 Sol). Only the lowest-scored READMEs are dropped to fit.
const TOKEN_BUDGET = 100_000

async function countTokens(text: string): Promise<number> {
  // Bedrock has no token-counting endpoint; ~4 characters per token is close enough for a budget.
  if (aiProvider() !== "anthropic") return Math.ceil((SYSTEM.length + text.length) / 4)
  const { input_tokens } = await new Anthropic().messages.countTokens({
    model: modelFor("anthropic", "extract"),
    system: SYSTEM,
    messages: [{ role: "user", content: text }],
  })
  return input_tokens
}

// Drop READMEs of the lowest-scored repos until the packed input fits. Returns what was skipped.
async function fitBudget(sources: SourceRow[]): Promise<{ sources: SourceRow[]; skipped: string[] }> {
  let current = sources
  const skipped: string[] = []
  const repos = sources.filter((s) => s.kind === "github" && s.meta?.repo_id).sort((a, b) => Number(a.meta.score ?? 0) - Number(b.meta.score ?? 0))
  for (;;) {
    const input_tokens = await countTokens(packSources(current))
    const next = repos.shift()
    if (input_tokens <= TOKEN_BUDGET || !next) return { sources: current, skipped }
    skipped.push(next.label)
    current = current.map((s) => (s.id === next.id ? { ...s, raw_text: s.raw_text.split("\nREADME:\n")[0] } : s))
  }
}

export async function extractRecord(userId: string, sources: SourceRow[]): Promise<{ output: ExtractOutput; skipped: string[]; sources: SourceRow[] }> {
  const fitted = await fitBudget(sources)
  const output = await generate({
    step: "extract",
    userId,
    schema: ExtractSchema,
    effort: "medium",
    maxTokens: 64000,
    system: SYSTEM,
    content: [
      { type: "text", text: packSources(fitted.sources), cache: true },
      { type: "text", text: "Build the Career Record from these sources." },
    ],
    // Facts citing unknown sources are dropped by the quote check, not retried: a retry re-runs the biggest call.
    logMeta: (out) => ({ items: out.items.length, facts: out.items.reduce((n, i) => n + i.facts.length, 0) }),
  })
  return { output, skipped: fitted.skipped, sources: fitted.sources }
}

import "server-only"
import { generate, UNTRUSTED_NOTE } from "@/lib/ai/client"
import { ChatReplySchema, type ChatContext, type ChatReply } from "@/lib/record/chat-actions"
import type { CareerRecord } from "@/lib/record/db"
import { itemTitle, type ResumeRow } from "@/lib/record/types"
import type { ResumeDoc } from "@/lib/resume/schema"

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

const SYSTEM = `You edit one developer resume by chatting with its owner. You can see the whole resume below: every <entry> and <line> has an id, and each entry lists the <fact>s it is built from. You change the resume only by returning actions; code checks each one and applies it, then tells the user what happened.

${UNTRUSTED_NOTE}

Actions:
- edit_line (line_id, text): replace a line with your full new text.
- add_line (entry_id, text): add a line to a job, project or award.
- remove_line (line_id).
- rewrite_entry (entry_id, text = the direction, e.g. "shorter", "lead with impact", "emphasize the React work"): our fact-checked writer rewrites all of that entry's lines from its facts.
- hide_entry / show_entry (entry_id): take an entry off the page, or bring one back from <not_on_page>.
- pin_entry / unpin_entry (entry_id): pinned entries are never cut to fit one page.
- move_entry (entry_id, position): 0-based position within its section.
- move_section (section, position): 0-based position among the sections on the page.
- update_details (entry_id, fields): title/company/dates/location/link/tech, or a skills group's name and list.
- update_header (fields): name, headline, target_role, email, phone, location, website, github, linkedin.

Rules:
- Never invent. A line may only say what that entry's facts say, or what the user told you in this chat. No new numbers, tools, titles, scale or outcomes. Code rejects numbers it can't find in either place.
- To reword existing lines, prefer rewrite_entry. Use edit_line for small, precise changes (shorten, fix wording, use the user's exact words) and add_line when the user tells you something new.
- If a <job_post> is given, this resume is for that job. When asked to fit it better, lead with lines that show what the post asks for, and use show_entry for a <not_on_page> entry whose facts show a requirement the <match_report> marks "elsewhere" or "unclear". Never add a skill or claim from the post that no fact contains; say plainly what the record doesn't show.
- If the request is unclear or needs information you don't have (a number, what they personally did), ask in reply and return no actions.
- Keep the resume one page and readable: strong verbs, about 14-22 words per line, no filler or buzzwords.
- reply: one to three short sentences saying what you're changing (or your question). Don't claim anything that isn't in actions. Plain words, no markdown headings.
- Off-topic requests: say briefly what you can do with this resume.`

function attrs(o: Record<string, string | undefined | null | boolean>) {
  return Object.entries(o)
    .filter(([, v]) => v != null && v !== "" && v !== false)
    .map(([k, v]) => (v === true ? k : `${k}="${String(v).replace(/"/g, "'")}"`))
    .join(" ")
}

export interface ChatJob {
  post: string
  // The saved match report's requirements, so "fit the job better" knows what's still missing.
  requirements: { text: string; status: string }[]
}

// The resume exactly as it is now, with ids, plus what's in the record but not on the page, and
// the job post a tailored resume was made for.
export function resumeForChat(resume: ResumeRow, record: CareerRecord, doc: ResumeDoc, job?: ChatJob): { text: string; ctx: Omit<ChatContext, "userMessages"> } {
  const items = new Map(record.items.map((i) => [i.id, i]))
  const ctx: Omit<ChatContext, "userMessages"> = { lines: new Map(), entries: new Map(), sections: [], factsByEntry: new Map() }
  for (const f of record.facts) ctx.factsByEntry.set(f.item_id, [...(ctx.factsByEntry.get(f.item_id) ?? []), f.text])

  const out: string[] = [
    `<resume ${attrs({ title: resume.kind === "base" ? "Base resume" : resume.title, kind: resume.kind, target_role: resume.layout.target_role })}>`,
    `<header ${attrs({ name: doc.name, headline: doc.headline, ...doc.contact })} />`,
  ]
  for (const section of doc.sections) {
    ctx.sections.push(section.type)
    out.push(`<section type="${section.type}" title="${section.title}">`)
    for (const e of section.entries) {
      const item = items.get(e.item_id)
      ctx.entries.set(e.item_id, { type: section.type, title: e.title, onPage: true })
      out.push(`  <entry ${attrs({ id: e.item_id, title: e.title, subtitle: e.subtitle, dates: e.dates, location: e.location, url: e.url, tech: e.tech.join(", "), pinned: item?.pinned })}>`)
      for (const f of record.facts.filter((x) => x.item_id === e.item_id)) out.push(`    <fact>${f.text}</fact>`)
      for (const b of e.bullets) {
        ctx.lines.set(b.id, { entryId: e.item_id, text: b.text })
        out.push(`    <line id="${b.id}">${b.text}</line>`)
      }
      out.push(`  </entry>`)
    }
    out.push(`</section>`)
  }
  out.push(`</resume>`)

  const off = record.items.filter((i) => i.type !== "contact" && !ctx.entries.has(i.id))
  if (off.length) {
    out.push(`<not_on_page>`)
    for (const i of off) {
      ctx.entries.set(i.id, { type: i.type as ChatContext["sections"][number], title: itemTitle(i), onPage: false })
      // Its facts too, so the chat can suggest bringing back the entry that shows what's asked for.
      const facts = record.facts.filter((f) => f.item_id === i.id)
      const head = `  <entry ${attrs({ id: i.id, type: i.type, title: itemTitle(i), status: i.status === "hidden" ? "hidden" : "cut to fit" })}`
      out.push(facts.length ? [`${head}>`, ...facts.map((f) => `    <fact>${f.text}</fact>`), `  </entry>`].join("\n") : `${head} />`)
    }
    out.push(`</not_on_page>`)
  }
  if (job) {
    out.push(`<job_post>\n${job.post.slice(0, 12000)}\n</job_post>`)
    if (job.requirements.length) out.push(`<match_report>\n${job.requirements.map((r) => `  <requirement status="${r.status}">${r.text}</requirement>`).join("\n")}\n</match_report>`)
  }
  return { text: out.join("\n"), ctx }
}

export async function chatTurn(userId: string, resumeText: string, history: ChatMessage[], ctx: ChatContext): Promise<ChatReply> {
  const convo = history.map((m) => `<${m.role}>\n${m.content}\n</${m.role}>`).join("\n")
  return generate({
    step: "chat",
    userId,
    schema: ChatReplySchema,
    effort: "medium",
    maxTokens: 8000,
    system: SYSTEM,
    content: [
      { type: "text", text: resumeText },
      { type: "text", text: `<conversation>\n${convo}\n</conversation>\n\nAnswer the last user message.` },
    ],
    // Ids are cheap to get wrong; one retry with the exact problems usually fixes them.
    check: (out) =>
      out.actions.flatMap((a) => [
        ...(a.line_id && !ctx.lines.has(a.line_id) ? [`line_id ${a.line_id} doesn't exist`] : []),
        ...(a.entry_id && !ctx.entries.has(a.entry_id) ? [`entry_id ${a.entry_id} doesn't exist`] : []),
      ]),
    acceptOnLastAttempt: true,
  })
}

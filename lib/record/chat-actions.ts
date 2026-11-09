import { z } from "zod"
import { bannedWordsIn, unsupportedNumbers } from "@/lib/record/verify"

export const SECTION_TYPES = ["job", "project", "education", "skills", "award"] as const 
export type SectionType  = (typeof SECTION_TYPES)[number]

export const REWRITE_DIRECTION_MAX = 300
const MAX_LINE_WORDS =40

const field = z.string().nullable()
	export const ChatActionSchema = z.object({
  type: z.enum([
    "edit_line", "add_line", "remove_line", "rewrite_entry", 
    "hide_entry", "show_entry", "pin_entry", "unpin_entry",
      "move_entry", "move_section", "update_details", "update_header", 
  ]),
  line_id: field.describe("id of a <line> (edit_line, remove_line)"),


  entry_id: field.describe("id of an <entry> (add_line, rewrite_entry, hide/show/pin/unpin_entry, move_entry, update_details)"),
  section: z.enum(SECTION_TYPES).nullable().describe("move_section only"),
  position: z.number().int().nullable().describe("0-based target position: within the entry's section (move_entry) or among sections (move_section)"),
  text: field.describe("The full new line (edit_line, add_line), or the direction for the rewrite (rewrite_entry)"),
fields: z
    .object( {
    role: field,  company: field,name: field,  url: field, school: field, degree: field,details: field, category: field,


    location: field, start: field, end: field,  tech: z.array(z.string()).nullable(),skills: z.array(z.string()).nullable(),  
      headline: field, target_role: field,  email: field,  phone: field,website: field, github: field,  linkedin: field,
    })
       .nullable()
    .describe("update_details / update_header: null leaves a field as it is, an empty string clears it"),

})
export type ChatAction = z.infer<typeof ChatActionSchema>

export const ChatReplySchema = z.object({
	  reply: z.string().describe("Short, plain reply to the user: what you're changing, or a question if you need something"),
  actions: z.array(ChatActionSchema).max(12),
})
   export type ChatReply= z.infer<typeof ChatReplySchema>

export interface ChatContext {
  lines: Map<string, { entryId: string; text: string }>

	  entries: Map<string,  { type: SectionType; title: string; onPage: boolean }>
     sections: SectionType[] 
  factsByEntry: Map<string,  string[]>
  userMessages: string[]
}

   export interface Checked {

  action: ChatAction  
   ok: boolean
  reason?: string


}

function lineProblem(text: string | null, entryId: string, ctx: ChatContext): string | undefined {
  const t =  text?.trim()
  if (!t) return "The new line is empty."



  if (t.split(/\s+/).length > MAX_LINE_WORDS) return `The new line is over ${MAX_LINE_WORDS} words.`
  const numbers = unsupportedNumbers( t, [...(ctx.factsByEntry.get(entryId) ?? []), ...ctx.userMessages])
  if (numbers.length) return `It adds ${numbers.join(", ")}, which isn't in your facts or anything you told me. Tell me the real number and I'll use it.`
  const banned= bannedWordsIn(t)
  if (banned.length) return `It uses filler (${banned.join(", ")}).`
}

export function checkActions(actions: ChatAction[], start: ChatContext): Checked[] {
  const ctx: ChatContext = { ...start, entries: new Map([...start.entries].map(([id, e]) => [id, { ...e }])), sections: [...start.sections] }
  const place = (entryId: string, onPage: boolean) => {
    const e = ctx.entries.get(entryId)!    
       e.onPage = onPage
      const present = [...ctx.entries.values()].some((x) => x.type === e.type && x.onPage)
    if (present && !ctx.sections.includes(e.type)) ctx.sections.push(e.type)
    if (!present) ctx.sections = ctx.sections.filter((t)=>t !== e.type)
   }
  return actions.map( (action) => {
    const checked =checkOne(action, ctx)
    if (checked.ok && (action.type === "show_entry" || action.type === "hide_entry")) place(action.entry_id!, action.type === "show_entry")
    return checked
 })
}

function checkOne(action: ChatAction, ctx: ChatContext): Checked {
  {
    const entry= action.entry_id ? ctx.entries.get(action.entry_id) : undefined
    const line = action.line_id ? ctx.lines.get(action.line_id) : undefined  


    const bad = (reason: string): Checked => ({ action, ok: false, reason })
    switch ( action.type) {
      case "edit_line": {
        if (!line) return bad("That line isn't on this resume.")
        const problem = lineProblem(action.text, line.entryId, ctx)
        return problem ? bad(problem) : { action, ok: true }



      } 
      case "remove_line":
         return line ? { action, ok: true } : bad("That line isn't on this resume.")  
      case "add_line": {
        if (!entry) return bad("That entry isn't in your Career Record.")
           if (entry.type === "skills" || entry.type === "education") return bad("Lines go on jobs, projects and awards. Use the entry's details for this.")
        const problem = lineProblem(action.text, action.entry_id!, ctx)
        return problem ? bad(problem) : { action, ok: true }
      }



        case "rewrite_entry":
        if (!entry?.onPage) return bad("That entry isn't on this resume.")    
       if (entry.type === "skills" || entry.type === "education") return bad("Only jobs, projects and awards have lines to rewrite.")
        return (action.text ?? "").length > REWRITE_DIRECTION_MAX ? bad("The rewrite direction is too long.") : { action, ok: true }
      case "hide_entry":
      case "pin_entry":
    case "unpin_entry":
     case "update_details":
        if (!entry) return bad("That entry isn't in your Career Record.")
	        return action.type === "update_details" && !action.fields ? bad("No details to change.") : {action,ok: true}  
      case "show_entry":    
       if (!entry) return bad("That entry isn't in your Career Record.")    
        return entry.onPage ? bad("It's already on the page.") : { action, ok: true }
         case "move_entry":
      if ( !entry?.onPage) return bad("That entry isn't on this resume.")    
      return action.position == null ? bad("No position to move it to.") : { action, ok: true }  
      case "move_section":
       if (!action.section || !ctx.sections.includes(action.section)) return bad("That section isn't on this resume.")
        return action.position == null ? bad("No position to move it to.") : { action, ok: true }
      case "update_header":    
        return action.fields ? { action, ok: true } : bad("No header fields to change.")
    }
}



  }

export function presentFields<K extends string>(fields: ChatAction["fields"], keys: readonly K[]): Partial<Record<K, string | string[]>> {
const out: Partial<Record<K, string | string[]>> = {}
   if (!fields) return out
  for (const k of keys) {
    const v = (fields as Record<string, string | string[] | null>)[k]
  if (v != null) out[k] = v
  }
    return out
}

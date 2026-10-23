// "Rewrite" directions offered in the editor. Kept out of actions.ts: a "use server" file may only export async functions.
export const REWRITE_STYLES = {
  default: undefined,
  shorter: "Make every bullet noticeably shorter: 10-16 words, same facts.",
  impact: "Lead each bullet with the result or scale the facts give, then how it was done.",
  technical: "Be more technical: name the exact technologies, architecture and techniques from the facts.",
  simpler: "Use plain words a non-engineer recruiter understands, keep the key technologies.",
} as const

export type RewriteStyle = keyof typeof REWRITE_STYLES

export const REWRITE_LABELS: Record<RewriteStyle, string> = {
  default: "Rewrite",
  shorter: "Shorter",
  impact: "Lead with impact",
  technical: "More technical",
  simpler: "Plainer words",
}

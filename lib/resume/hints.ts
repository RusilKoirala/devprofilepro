// Per-bullet coaching shown in the editor. Plain code, no AI: each hint names one fixable thing.
import { bannedWordsIn } from "@/lib/record/verify"

export interface BulletHint {
  kind: "weak_start" | "buzzword" | "too_long" | "repeated_verb" | "no_result"
  text: string
}

const WEAK_START = /^(worked on|working on|responsible for|helped( to)?|assisted( with| in)?|involved in|participated in|tasked with|in charge of|did|made|was|duties included|contributed to)\b/i
const RESULT = /\d|%|\b(users?|customers?|students?|teams?|downloads?|stars?|requests?|faster|slower|reduc|cut|increas|improv|sav|grew|grow|doubl|halv|enabl|allow|replac|automat|prevent|fix|eliminat|adopted|used by|serv|deploy|launch|ship|releas|merged|won|award)/i
export const MAX_BULLET_WORDS = 28

function firstWord(text: string) {
  return text.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "") ?? ""
}

// One hint per bullet at most, most useful first. `others` is every other bullet on the page.
export function bulletHint(text: string, others: string[] = []): BulletHint | null {
  const t = text.trim()
  if (WEAK_START.test(t)) return { kind: "weak_start", text: "Starts weak. Lead with what you built or changed." }
  const buzz = bannedWordsIn(t)
  if (buzz.length) return { kind: "buzzword", text: `"${buzz[0]}" reads as filler. Say what actually happened.` }
  const words = t.split(/\s+/).length
  if (words > MAX_BULLET_WORDS) return { kind: "too_long", text: `${words} words. Recruiters skim; aim for under 22.` }
  const verb = firstWord(t)
  const repeats = others.filter((o) => firstWord(o) === verb).length
  if (verb.length > 2 && repeats >= 2) return { kind: "repeated_verb", text: `"${t.split(/\s+/)[0]}" opens ${repeats + 1} bullets. Vary the verbs.` }
  if (!RESULT.test(t)) return { kind: "no_result", text: "No result or scale. Who used it, or what got better?" }
  return null
}

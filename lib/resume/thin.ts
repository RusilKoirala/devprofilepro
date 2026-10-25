// Lines that say nothing the entry's heading doesn't: they repeat its title, company and dates,
// only give a link, or only count commits. The checks flag them on a resume; the writer rejects
// them before they get there.

const DEPLOY_ONLY = /^(deployed|hosted|live|available|launched|published)\b[^.]{0,40}\b(at|on|to)\b\s*(https?:\/\/|www\.|[a-z0-9-]+\.(?:app|dev|com|io|me|vercel\.app|netlify\.app))/i
const URL_ONLY = /^\S*(https?:\/\/|www\.)\S+\.?$/i
// Repo statistics say how much, not what: "17 commits in a solo repo".
const STATS_ONLY = /\b\d+\s+(commits?|stars?|forks?|pull requests?|PRs?)\b/i

function words(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w.length > 2)
}

export function thinLine(text: string, heading: { title: string; subtitle: string; dates: string }): boolean {
  const t = text.trim()
  if (DEPLOY_ONLY.test(t) || URL_ONLY.test(t)) return true
  if (STATS_ONLY.test(t) && words(t).length <= 16) return true
  // Most of the line's words are the title, company and dates already in the heading.
  const said = new Set(words([heading.title, heading.subtitle, heading.dates].join(" ")))
  const own = words(t)
  return own.length > 0 && own.length <= 14 && own.filter((w) => said.has(w)).length / own.length >= 0.6
}

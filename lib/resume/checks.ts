import "server-only"
import { bannedWordsIn } from "@/lib/record/verify"
import { dateFormat, dateValue as toNumber } from "@/lib/resume/dates"
import type { ResumeDoc } from "@/lib/resume/schema"
import { publicRequestStatus } from "@/lib/security/public-request"

export type CheckStatus = "pass" | "warn" | "fail" | "not_checked"

export interface CheckResult {
  id: string
  label: string
  status: CheckStatus
  detail?: string
  // Where on the resume to look, so the editor can take the person there.
  targets?: { itemId: string; bulletId?: string }[]
  // Lines the person can settle from the checks panel, each on its own: take it off this resume
  // ("remove"), or also confirm it still holds ("review").
  lines?: { itemId: string; bulletId: string; text: string }[]
  fix?: "remove" | "review"
}

// Warnings serious enough that the resume isn't called ready until they're dealt with.
const BLOCKING = new Set(["empty", "ownership", "partial_sources"])

export type LinkStatus = "ok" | "broken" | "restricted" | "unchecked"

export async function testLink(url: string): Promise<LinkStatus> {
  const signal = AbortSignal.timeout(5000)
  const attempt = (method: "HEAD" | "GET") => publicRequestStatus(url, method, signal)
  try {
    let status = await attempt("HEAD")
    if (status === 405 || status === 400) status = await attempt("GET")
    if (status >= 200 && status < 300) return "ok"
    if (status === 401 || status === 403 || status === 429 || status === 999) return "restricted"
    if (status === 404 || status === 410) return "broken"
    return "unchecked"
  } catch {
    return "unchecked"
  }
}

// Lines that only repeat what the entry's heading already says, or only give a link.
const DEPLOY_ONLY = /^(deployed|hosted|live|available|launched|published)\b[^.]{0,40}\b(at|on|to)\b\s*(https?:\/\/|www\.|[a-z0-9-]+\.(?:app|dev|com|io|me|vercel\.app|netlify\.app))/i
const URL_ONLY = /^\S*(https?:\/\/|www\.)\S+\.?$/i
// Repo statistics say how much, not what: "17 commits in a solo repo".
const STATS_ONLY = /\b\d+\s+(commits?|stars?|forks?|pull requests?|PRs?)\b/i

function words(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w.length > 2)
}

// Writing problems a structure check can catch: entries with nothing under them, lines that repeat
// the heading or are only a link, the same skill in two groups, a date written twice.
export function contentChecks(doc: ResumeDoc, opts: { openOwnership?: { itemId: string; title: string }[] } = {}): CheckResult[] {
  const entries = doc.sections.flatMap((s) => s.entries.map((e) => ({ ...e, type: s.type })))
  const emptyEntries = entries.filter((e) => (e.type === "job" || e.type === "project") && !e.bullets.length)
  const empty = emptyEntries.map((e) => e.title || e.subtitle)
  const thinLines = entries.flatMap((e) =>
    e.bullets
      .filter((b) => {
        const t = b.text.trim()
        if (DEPLOY_ONLY.test(t) || URL_ONLY.test(t)) return true
        if (STATS_ONLY.test(t) && words(t).length <= 16) return true
        // Most of the line's words are the title, company and dates already in the heading.
        const heading = new Set(words([e.title, e.subtitle, e.dates].join(" ")))
        const own = words(t)
        return own.length > 0 && own.length <= 14 && own.filter((w) => heading.has(w)).length / own.length >= 0.6
      })
      .map((b) => ({ itemId: e.item_id, bulletId: b.id, text: b.text }))
  )
  const thin = thinLines.map((l) => `“${l.text.length > 60 ? `${l.text.slice(0, 57)}…` : l.text}”`)
  const groups = doc.sections.filter((s) => s.type === "skills").flatMap((s) => s.entries)
  const seen = new Map<string, string>()
  const repeated = new Set<string>()
  const repeatedIn = new Set<string>()
  for (const g of groups)
    for (const sk of g.subtitle.split(/,\s*/).map((x) => x.trim()).filter(Boolean)) {
      const key = sk.toLowerCase()
      if (seen.has(key) && seen.get(key) !== g.title) {
        repeated.add(sk)
        repeatedIn.add(g.item_id)
      }
      else seen.set(key, g.title)
    }
  const twiceDatedEntries = entries.filter((e) => e.type === "education" && e.dates && e.dates.split(/\s+[–-]\s+/).some((d) => d && e.subtitle.toLowerCase().includes(d.toLowerCase())))
  const twiceDated = twiceDatedEntries.map((e) => e.title)
  const owners = opts.openOwnership ?? []

  return [
    {
      id: "empty",
      label: "Every job and project says what you did",
      status: empty.length ? "warn" : "pass",
      detail: empty.length ? `No lines under: ${empty.join(", ")}. Add what you did, or hide the entry.` : undefined,
      targets: emptyEntries.map((e) => ({ itemId: e.item_id })),
    },
    {
      id: "thin",
      label: "Lines add something new",
      status: thin.length ? "warn" : "pass",
      detail: thin.length ? `Only repeats the heading, gives a link or counts commits: ${thin.slice(0, 3).join("; ")}${thin.length > 3 ? ` and ${thin.length - 3} more` : ""}` : undefined,
      targets: thinLines.map(({ itemId, bulletId }) => ({ itemId, bulletId })),
      lines: thinLines,
      fix: "remove",
    },
    {
      id: "repeats",
      label: "Nothing listed twice",
      status: repeated.size || twiceDated.length ? "warn" : "pass",
      detail: [repeated.size && `In more than one skills group: ${[...repeated].join(", ")}`, twiceDated.length && `Date written twice in ${twiceDated.join(", ")}`].filter(Boolean).join(" · ") || undefined,
      targets: [...[...repeatedIn].map((itemId) => ({ itemId })), ...twiceDatedEntries.map((e) => ({ itemId: e.item_id }))],
    },
    {
      id: "ownership",
      label: "Team projects say what you built",
      status: owners.length ? "warn" : "pass",
      detail: owners.length ? `Answer the question on ${owners.map((o) => o.title).join(", ")} so its lines are about your part.` : undefined,
      targets: owners.map((o) => ({ itemId: o.itemId })),
    },
  ]
}

export async function runChecks(
  doc: ResumeDoc,
  opts: { pages: number; allBulletsSourced: boolean; openOwnership?: { itemId: string; title: string }[]; reviewLines?: string[] }
): Promise<{ results: CheckResult[]; ready: boolean }> {
  const results: CheckResult[] = []

  results.push({ id: "pages", label: "Fits on one page", status: opts.pages === 1 ? "pass" : "fail", detail: opts.pages === 1 ? undefined : `${opts.pages} pages` })

  const links = [doc.contact.github, doc.contact.linkedin, doc.contact.website].filter(Boolean)
  const hasContact = Boolean(doc.name && doc.contact.email && links.length)
  results.push({
    id: "contact",
    label: "Name, email and a link",
    status: hasContact ? "pass" : "fail",
    detail: hasContact ? undefined : [!doc.name && "name", !doc.contact.email && "email", !links.length && "a GitHub, LinkedIn or website link"].filter(Boolean).join(", ") + " missing",
  })

  // Dates: one format everywhere, end >= start
  const ranges = doc.sections.flatMap((s) => s.entries).map((e) => e.dates).filter(Boolean)
  const parts = ranges.flatMap((r) => r.split(/\s+[–-]\s+/))
  const formats = new Set(parts.map(dateFormat).filter((f) => f !== "present"))
  const backwards = ranges.filter((r) => {
    const [a, b] = r.split(/\s+[–-]\s+/)
    const na = a && toNumber(a), nb = b && toNumber(b)
    return typeof na === "number" && typeof nb === "number" && nb < na
  })
  const unrecognized = parts.filter((p) => toNumber(p) == null)
  results.push({
    id: "dates",
    label: "Dates are consistent",
    status: backwards.length ? "fail" : !ranges.length ? "not_checked" : unrecognized.length || formats.size > 1 ? "warn" : "pass",
    detail: backwards.length ? `End before start: ${backwards.join("; ")}` : unrecognized.length ? `Couldn't check: ${unrecognized.join(", ")}` : formats.size > 1 ? `Mixed formats: ${[...formats].join(", ")}` : undefined,
  })

  // Links
  const allLinks = [...new Set([...links, ...doc.sections.flatMap((s) => s.entries.map((e) => e.url)).filter(Boolean)])]
  const statuses = await Promise.all(allLinks.map(async (u) => [u, await testLink(u)] as const))
  const broken = statuses.filter(([, s]) => s === "broken").map(([u]) => u)
  const restricted = statuses.filter(([, s]) => s === "restricted").map(([u]) => u)
  const unchecked = statuses.filter(([, s]) => s === "unchecked").map(([u]) => u)
  results.push({
    id: "links",
    label: "Links work",
    status: broken.length ? "fail" : !allLinks.length || unchecked.length === allLinks.length ? "not_checked" : restricted.length || unchecked.length ? "warn" : "pass",
    detail: [
      broken.length && `Broken: ${broken.join(", ")}`,
      restricted.length && `Restricted (normal for LinkedIn, check by hand): ${restricted.join(", ")}`,
      unchecked.length && `Couldn't check: ${unchecked.join(", ")}`,
    ].filter(Boolean).join(" · ") || undefined,
  })

  const bulletTexts = doc.sections.flatMap((s) => s.entries.flatMap((e) => e.bullets.map((b) => b.text)))
  const buzz = [...new Set(bulletTexts.flatMap(bannedWordsIn))]
  results.push({ id: "buzzwords", label: "No buzzwords", status: buzz.length ? "warn" : "pass", detail: buzz.length ? buzz.join(", ") : undefined })

  // Skills are used somewhere else on the page
  const skills = doc.sections.filter((s) => s.type === "skills").flatMap((s) => s.entries.flatMap((e) => e.subtitle.split(/,\s*/))).filter(Boolean)
  const body = [...bulletTexts, ...doc.sections.flatMap((s) => s.entries.flatMap((e) => e.tech))].join(" ").toLowerCase()
  const unused = skills.filter((sk) => !body.includes(sk.toLowerCase()))
  results.push({
    id: "skills",
    label: "Listed skills are backed up",
    status: !skills.length ? "not_checked" : unused.length ? "warn" : "pass",
    detail: unused.length ? `Not shown in any project or job: ${unused.join(", ")}` : undefined,
  })

  results.push({ id: "sources", label: "Every line has a source", status: opts.allBulletsSourced ? "pass" : "fail" })
  // Lines that kept one source after another they cited was removed.
  const review = new Set(opts.reviewLines ?? [])
  const partly = doc.sections.flatMap((s) => s.entries.flatMap((e) => e.bullets.filter((b) => review.has(b.id)).map((b) => ({ itemId: e.item_id, bulletId: b.id, text: b.text }))))
  results.push({
    id: "partial_sources",
    label: "Lines are still fully backed",
    status: partly.length ? "warn" : "pass",
    detail: partly.length ? `A source behind part of ${partly.length === 1 ? "this line" : `these ${partly.length} lines`} was removed. Check the whole line is still true, then keep, edit or remove it.` : undefined,
    targets: partly.map(({ itemId, bulletId }) => ({ itemId, bulletId })),
    lines: partly,
    fix: "review",
  })
  results.push(...contentChecks(doc, opts))

  const order: Record<CheckStatus, number> = { fail: 0, warn: 1, not_checked: 2, pass: 3 }
  results.sort((a, b) => order[a.status] - order[b.status])
  return { results, ready: !results.some((r) => r.status === "fail" || (r.status === "warn" && BLOCKING.has(r.id))) }
}

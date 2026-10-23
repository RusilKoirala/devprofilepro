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
}

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

export async function runChecks(doc: ResumeDoc, opts: { pages: number; allBulletsSourced: boolean }): Promise<{ results: CheckResult[]; ready: boolean }> {
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

  const order: Record<CheckStatus, number> = { fail: 0, warn: 1, not_checked: 2, pass: 3 }
  results.sort((a, b) => order[a.status] - order[b.status])
  return { results, ready: !results.some((r) => r.status === "fail") }
}

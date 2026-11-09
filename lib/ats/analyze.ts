import { bannedWordsIn } from "@/lib/record/verify"

export interface PdfLine {
  page: number
  xs: number[]
  runs: string[]
}

export interface ExtractedPdf {
  pages: number
  text: string
  lines: PdfLine[]
  links: string[]
}

export type AtsStatus = "pass" | "warn" | "fail"

export type AtsGroup = "parsing" | "info" | "content"

export interface AtsCheck {
  id: string
  group: AtsGroup
  label: string
  status: AtsStatus
  detail: string
  fix?: string
}

export interface AtsReport {
  verdict: "pass" | "fail"
  missingInfo: string[]
  score: number
  checks: AtsCheck[]
  words: number
  preview: string
}

const MIN_TEXT_CHARS = 40
const SHORT_TEXT_CHARS = 250
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
const PHONE = /(?:\+?\d[\d\s().-]{7,}\d)/
const PROFILE = /(linkedin\.com\/in\/|github\.com\/|gitlab\.com\/|https?:\/\/[^\s]+\.(dev|io|me|com|app))/i
const ICON_GLYPHS = /[-�]/g
const BULLET = /^\s*[•●▪◦‣∙·\-–*]\s+/
const WEAK_OPENERS = /^\s*(?:[•●▪◦‣∙·\-–*]\s*)?(responsible for|worked on|helped|assisted|involved in|participated in|tasked with)\b/i

const SECTIONS: { id: string; name: string; pattern: RegExp }[] = [
  { id: "experience", name: "Experience", pattern: /^(work |professional |relevant )?(experience|employment( history)?|work history)$/i },
  { id: "education", name: "Education", pattern: /^(education|academic background|academics)$/i },
  { id: "skills", name: "Skills", pattern: /^(technical |core )?skills( & tools| and tools)?$|^technologies$|^tech stack$/i },
  { id: "projects", name: "Projects", pattern: /^(personal |selected |side |academic )?projects$/i },
]

const MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?"
const DATE_FORMATS: [string, RegExp][] = [
  ["Mon YYYY", new RegExp(`\\b${MONTH}\\s+\\d{4}\\b`, "gi")],
  ["MM/YYYY", /\b(0?[1-9]|1[0-2])\/\d{4}\b/g],
  ["YYYY-MM", /\b\d{4}-(0[1-9]|1[0-2])\b/g],
]

function lineText(l: PdfLine) {
  return l.runs.join(" ").replace(/\s+/g, " ").trim()
}

export function looksTwoColumn(lines: PdfLine[]): boolean {
  const starts = lines.filter((l) => l.runs.join("").trim().length >= 8).map((l) => l.xs[0])
  const midStarts = starts.filter((x) => x >= 0.3 && x <= 0.7).length
  const leftStarts = starts.filter((x) => x < 0.25).length
  if (starts.length >= 12 && midStarts / starts.length >= 0.25 && leftStarts / starts.length >= 0.25) return true
  const split = lines.filter((l) => {
    for (let i = 1; i < l.xs.length; i++) {
      const left = l.runs.slice(0, i).join(" ").trim()
      const right = l.runs.slice(i).join(" ").trim()
      if (l.xs[i] >= 0.3 && l.xs[i] <= 0.7 && left.length >= 12 && right.length >= 12) return true
    }
    return false
  })
  return split.length >= 6 && split.length / Math.max(1, lines.length) >= 0.2
}

export function analyzeResume(pdf: ExtractedPdf): AtsReport {
  const text = pdf.text.replace(/[ \t]+/g, " ").trim()
  const lines = pdf.lines.map(lineText).filter(Boolean)
  const words = text.split(/\s+/).filter(Boolean).length
  const checks: AtsCheck[] = []

  const chars = text.replace(/\s/g, "").length
  const readable = chars >= MIN_TEXT_CHARS
  checks.push(
    readable
      ? chars < SHORT_TEXT_CHARS
        ? { id: "text", group: "parsing", label: "Text can be read", status: "warn", detail: `Only ${words.toLocaleString()} words could be read. If your resume has more than this, parts of it may be images.`, fix: "Check that every part of the resume is real text: try selecting it in your PDF viewer." }
        : { id: "text", group: "parsing", label: "Text can be read", status: "pass", detail: `${words.toLocaleString()} words found.` }
      : {
          id: "text",
          group: "parsing",
          label: "Text can be read",
          status: "fail",
          detail: "Almost no text could be extracted. This looks like a scanned image or a design export, which most ATSs read as blank.",
          fix: "Export the PDF from Word, Google Docs or LaTeX so the text is selectable. If you can't highlight words in your PDF viewer, an ATS can't read them either.",
        }
  )
  if (!readable) return finish(checks, words, text)

  const email = EMAIL.test(text)
  const phone = PHONE.test(text)
  const profile = PROFILE.test(text) || pdf.links.some((l) => PROFILE.test(l))
  const missing = [!email && "email", !phone && "phone number", !profile && "LinkedIn, GitHub or portfolio link"].filter(Boolean) as string[]
  checks.push({
    id: "contact",
    group: "info",
    label: "Contact details",
    status: !email ? "fail" : missing.length ? "warn" : "pass",
    detail: missing.length ? `Couldn't find: ${missing.join(", ")}.` : "Email, phone and a profile link were found.",
    fix: missing.length ? "Put your email, phone and a LinkedIn or GitHub link as plain text at the top, not inside a header, footer, image or icon." : undefined,
  })

  const found = SECTIONS.filter((s) => lines.some((l) => l.length <= 40 && s.pattern.test(l.replace(/[:|]/g, "").trim())))
  const hasWork = found.some((s) => s.id === "experience" || s.id === "projects")
  const notFound = SECTIONS.filter((s) => !found.includes(s) && !(s.id === "projects" && found.some((f) => f.id === "experience"))).map((s) => s.name)
  checks.push({
    id: "sections",
    group: "info",
    label: "Standard section headings",
    status: !hasWork ? "fail" : notFound.length ? "warn" : "pass",
    detail: found.length ? `Found ${found.map((s) => s.name).join(", ")}.${notFound.length ? ` Missing ${notFound.join(", ")}.` : ""}` : "No standard headings found.",
    fix: notFound.length ? `Use plain headings an ATS expects: ${SECTIONS.map((s) => s.name).join(", ")}. Creative names like "My Journey" or "Toolbox" often aren't recognised.` : undefined,
  })

  const twoColumn = looksTwoColumn(pdf.lines)
  checks.push({
    id: "layout",
    group: "parsing",
    label: "Single-column layout",
    status: twoColumn ? "warn" : "pass",
    detail: twoColumn ? "Parts of this resume are laid out in two columns. Many ATSs read straight across, mixing the columns together." : "Reads top to bottom in one column.",
    fix: twoColumn ? "Move sidebar content (skills, contact, languages) into the main column, or use a single-column template." : undefined,
  })

  const glyphs = (text.match(ICON_GLYPHS) ?? []).length
  checks.push({
    id: "glyphs",
    group: "parsing",
    label: "No unreadable symbols",
    status: glyphs >= 3 ? "warn" : "pass",
    detail: glyphs ? `${glyphs} characters came out as unreadable symbols, usually icons for phone, email or skills.` : "No icon glyphs or broken characters.",
    fix: glyphs >= 3 ? "Replace icons with words (\"Email:\", \"GitHub:\") and drop skill-rating bars or dots." : undefined,
  })

  const formats = DATE_FORMATS.filter(([, re]) => (text.match(re) ?? []).length > 0).map(([name]) => name)
  const anyDates = formats.length > 0 || /\b(19|20)\d{2}\b/.test(text)
  checks.push({
    id: "dates",
    group: "info",
    label: "Dates are readable",
    status: !anyDates || formats.length > 1 ? "warn" : "pass",
    detail: !anyDates ? "No dates found for your jobs, projects or education." : formats.length > 1 ? `Dates are written in different ways (${formats.join(", ")}).` : "Dates use one consistent format.",
    fix: !anyDates ? "Add start and end dates like \"Jun 2024 – Aug 2025\" to each job and school." : formats.length > 1 ? "Pick one format, e.g. \"Jun 2024 – Present\", and use it everywhere." : undefined,
  })

  checks.push({
    id: "length",
    group: "content",
    label: "Length",
    status: pdf.pages > 2 || words < 200 ? "warn" : "pass",
    detail: `${pdf.pages} page${pdf.pages === 1 ? "" : "s"}, ${words.toLocaleString()} words.`,
    fix: pdf.pages > 2 ? "Cut to one page (two at most with 10+ years of experience). Recruiters skim; extra pages bury your best work." : words < 200 ? "This is very short. Add your projects, what you built in each, and the tools you used." : undefined,
  })

  const bullets = lines.filter((l) => BULLET.test(l))
  const withNumbers = bullets.filter((b) => /\d/.test(b.replace(/\b(19|20)\d{2}\b/g, "")))
  const weak = lines.filter((l) => WEAK_OPENERS.test(l)).length
  const buzz = [...new Set(bannedWordsIn(text))]
  const resultsShare = bullets.length ? withNumbers.length / bullets.length : 0
  const contentIssues = [
    !bullets.length && "no bullet points found",
    bullets.length >= 4 && resultsShare < 0.25 && `only ${withNumbers.length} of ${bullets.length} bullets include a number`,
    weak > 0 && `${weak} line${weak === 1 ? " starts" : "s start"} with "Responsible for", "Worked on" or "Helped"`,
    buzz.length > 0 && `buzzwords: ${buzz.join(", ")}`,
  ].filter(Boolean) as string[]
  checks.push({
    id: "content",
    group: "content",
    label: "Specific, result-focused bullets",
    status: contentIssues.length ? "warn" : "pass",
    detail: contentIssues.length ? `${contentIssues.join("; ")}.`.replace(/^./, (c) => c.toUpperCase()) : "Bullets lead with action and show results.",
    fix: !bullets.length ? "Under each job and project, list what you did as short bullet points, each starting with what you built or changed." : contentIssues.length ? "Start each bullet with what you built or changed, name the tools, and add a number when you know one (users, speed, time saved)." : undefined,
  })

  return finish(checks, words, text)
}

function finish(checks: AtsCheck[], words: number, text: string): AtsReport {
  const order: Record<AtsStatus, number> = { fail: 0, warn: 1, pass: 2 }
  checks.sort((a, b) => order[a.status] - order[b.status])
  const points = checks.reduce((n, c) => n + (c.status === "pass" ? 1 : c.status === "warn" ? 0.5 : 0), 0)
  const missingInfo = checks.filter((c) => c.group === "info" && c.status === "fail").map((c) => c.label.toLowerCase())
  return {
    verdict: checks.some((c) => c.group === "parsing" && c.status === "fail") ? "fail" : "pass",
    missingInfo,
    score: checks.length ? Math.round((points / checks.length) * 100) : 0,
    checks,
    words,
    preview: text.slice(0, 3000),
  }
}

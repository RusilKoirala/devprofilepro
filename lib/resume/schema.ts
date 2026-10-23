import { z } from "zod"

// Single source of truth for the generated resume. Unknown values are empty
// strings / arrays rather than nulls so the LaTeX renderer stays simple.
export const ResumeSchema = z.object({
  name: z.string(),
  headline: z.string().describe("Short professional title, e.g. 'Full-Stack Engineer'"),
  contact: z.object({
    email: z.string(),
    phone: z.string(),
    location: z.string(),
    website: z.string(),
    github: z.string().describe("Full URL"),
    linkedin: z.string().describe("Full URL"),
    x: z.string().describe("Full URL"),
  }),
  summary: z.string().describe("1-2 sentences, or empty if the page is already full"),
  experience: z.array(
    z.object({
      company: z.string(),
      role: z.string(),
      location: z.string(),
      start: z.string().describe("e.g. 'Jun 2024'"),
      end: z.string().describe("e.g. 'Present'"),
      bullets: z.array(z.string()),
    })
  ),
  projects: z.array(
    z.object({
      name: z.string(),
      url: z.string(),
      tech: z.array(z.string()),
      bullets: z.array(z.string()),
    })
  ),
  education: z.array(
    z.object({
      school: z.string(),
      degree: z.string(),
      location: z.string(),
      start: z.string(),
      end: z.string(),
      details: z.string().describe("GPA, honours, relevant coursework; may be empty"),
    })
  ),
  skills: z.array(
    z.object({
      category: z.string(),
      items: z.array(z.string()),
    })
  ),
  achievements: z.array(z.string()),
})

export type Resume = z.infer<typeof ResumeSchema>

export type SourceKind = "resume" | "github" | "linkedin" | "x"

export interface SourceDoc {
  source: SourceKind
  title: string
  text: string
  url?: string
}

// What the client sends to /api/generate. Uploaded PDFs are converted to text
// first (via /api/extract) so the browser can store and resend them.
export const GenerateRequestSchema = z.object({
  githubUsername: z.string().trim().default(""),
  linkedinUrl: z.string().trim().default(""),
  linkedinText: z.string().default(""),
  xHandle: z.string().trim().default(""),
  xText: z.string().default(""),
  resumeText: z.string().default(""),
  targetRole: z.string().trim().default(""),
})

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>

export interface GenerateResponse {
  resume: Resume
  latex: string
  githubFingerprint: string | null
  sources: { source: SourceKind; title: string }[]
  generatedAt: string
}

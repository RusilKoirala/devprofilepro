export type SourceKind = "github" | "resume_pdf" | "linkedin_pdf" | "paste" | "pr_link" | "win"

export interface IngestedSource {
  kind: SourceKind
  label: string
  raw_text: string
  url?: string | null
  file_path?: string | null
  dedupe_key?: string | null
  meta?: Record<string, unknown>
  status?: "ok" | "partial" | "failed"
}

export interface SignalFact {
  text: string
  quote: string
}

export interface RepoMeta {
  repo_id: number
  name: string
  stars: number
  forks: number
  is_fork: boolean
  archived: boolean
  homepage: string | null
  pushed_at: string
  languages: string[]
  deps: string[]
  contributors: number | null
  user_commits: number | null
  score: number
  signals: SignalFact[]
}

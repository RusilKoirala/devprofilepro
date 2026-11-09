import "server-only"
import { clerkClient } from "@clerk/nextjs/server"
import type { IngestedSource, RepoMeta, SignalFact } from "@/lib/ingest/types"

const API = "https://api.github.com"
const MAX_DEEP = 15
const MAX_REPOS = 300
const MAX_README_CHARS = 6000

interface GitHubUser {
  login: string
  name: string | null
  bio: string | null
  company: string | null
  blog: string | null
  location: string | null
  email: string | null
  twitter_username: string | null
  html_url: string
}

interface GitHubRepo {
  id: number
  name: string
  full_name: string
  description: string | null
  language: string | null
  stargazers_count: number
  forks_count: number
  fork: boolean
  archived: boolean
  size: number
  topics?: string[]
  homepage: string | null
  html_url: string
  pushed_at: string
}

export class GitHubError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

const NOTABLE_DEPS: Record<string, string> = {
  next: "Next.js", react: "React", vue: "Vue", svelte: "Svelte", "@angular/core": "Angular",
  express: "Express", fastify: "Fastify", "@nestjs/core": "NestJS", hono: "Hono",
  prisma: "Prisma", "drizzle-orm": "Drizzle", mongoose: "MongoDB", pg: "PostgreSQL",
  "@supabase/supabase-js": "Supabase", firebase: "Firebase", redis: "Redis", ioredis: "Redis",
  tailwindcss: "Tailwind CSS", "socket.io": "Socket.IO", graphql: "GraphQL", trpc: "tRPC",
  "@trpc/server": "tRPC", stripe: "Stripe", "react-native": "React Native", expo: "Expo",
  electron: "Electron", three: "Three.js", "@anthropic-ai/sdk": "Claude API", openai: "OpenAI API",
  langchain: "LangChain", vitest: "Vitest", jest: "Jest", playwright: "Playwright",
  django: "Django", flask: "Flask", fastapi: "FastAPI", sqlalchemy: "SQLAlchemy", pandas: "pandas",
  numpy: "NumPy", torch: "PyTorch", tensorflow: "TensorFlow", "scikit-learn": "scikit-learn",
  pydantic: "Pydantic", celery: "Celery", "github.com/gin-gonic/gin": "Gin", "github.com/gofiber/fiber": "Fiber",
  tokio: "Tokio", axum: "Axum", actix_web: "Actix", "actix-web": "Actix", serde: "Serde",
}

const TUTORIAL_NAME = /(todo|clone|tutorial|course|bootcamp|practice|exercise|learning|hello-?world)/i

export async function githubTokenFor(userId: string): Promise<{ token: string | null; login: string | null }> {
  try {
    const client = await clerkClient()
    const [tokens, user] = await Promise.all([
      client.users.getUserOauthAccessToken(userId, "github"),
      client.users.getUser(userId),
    ])
    const login = user.externalAccounts.find((a) => a.provider.includes("github"))?.username ?? null
    const token = tokens.data[0]?.token ?? null
    if (token) return { token, login }
    return { token: process.env.GITHUB_TOKEN ?? null, login }
  } catch {
    return { token: process.env.GITHUB_TOKEN ?? null, login: null }
  }
}

function makeFetch(token: string | null) {
  const headers = (accept = "application/vnd.github+json"): HeadersInit => ({
    Accept: accept,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "devprofile-pro",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  })

  async function gh<T>(path: string): Promise<T> {
    const res = await fetch(`${API}${path}`, { headers: headers(), cache: "no-store" })
    if (res.status === 404) throw new GitHubError("Not found on GitHub", 404)
    if (res.status === 403 || res.status === 429) throw new GitHubError("GitHub rate limit hit", res.status)
    if (!res.ok) throw new GitHubError(`GitHub API error (${res.status})`, res.status)
    return res.json() as Promise<T>
  }

  async function raw(path: string): Promise<string | null> {
    const res = await fetch(`${API}${path}`, { headers: headers("application/vnd.github.raw+json"), cache: "no-store" })
    return res.ok ? res.text() : null
  }

  async function count(path: string): Promise<number | null> {
    const res = await fetch(`${API}${path}${path.includes("?") ? "&" : "?"}per_page=1`, { headers: headers(), cache: "no-store" })
    if (!res.ok) return null
    const last = res.headers.get("link")?.match(/[?&]page=(\d+)>; rel="last"/)
    if (last) return Number(last[1])
    const body = (await res.json()) as unknown[]
    return Array.isArray(body) ? body.length : null
  }

  return { gh, raw, count }
}

export function normalizeGitHubUsername(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\/(www\.)?github\.com\//i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0]
}

function quickScore(r: GitHubRepo): number {
  const ageDays = (Date.now() - new Date(r.pushed_at).getTime()) / 86_400_000
  let s = 0
  if (r.homepage) s += 15
  if (r.description) s += 5
  s += Math.min(20, r.stargazers_count * 2)
  s += Math.max(0, 10 - ageDays / 36)
  if (r.fork) s -= 25
  if (r.size === 0) s -= 40
  if (TUTORIAL_NAME.test(r.name)) s -= 10
  return s
}

function parseDeps(file: string, text: string): string[] {
  const names: string[] = []
  try {
    if (file === "package.json") {
      const pkg = JSON.parse(text)
      names.push(...Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }))
    } else if (file === "go.mod") {
      for (const m of text.matchAll(/^\s*(?:require\s+)?([\w.\-/]+)\s+v[\d.]+/gm)) names.push(m[1])
    } else {
      for (const m of text.matchAll(/^\s*"?([A-Za-z][\w\-]*)/gm)) names.push(m[1].toLowerCase())
    }
  } catch {
    return []
  }
  return [...new Set(names.map((n) => NOTABLE_DEPS[n]).filter(Boolean))]
}

const MANIFESTS = ["package.json", "requirements.txt", "pyproject.toml", "go.mod", "Cargo.toml"]

export async function ingestGitHub(opts: { userId: string; username?: string }): Promise<IngestedSource[]> {
  const { token, login } = await githubTokenFor(opts.userId)
  const username = normalizeGitHubUsername(opts.username || login || "")
  if (!username) throw new GitHubError("No GitHub username", 400)
  if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username)) throw new GitHubError("Invalid GitHub username", 400)
  if (login && username.toLowerCase() !== login.toLowerCase()) {
    throw new GitHubError(`You're connected to GitHub as @${login}, so only that profile can be imported.`, 403)
  }
  const unverified = !login
  const { gh, raw, count } = makeFetch(token)

  const user = await gh<GitHubUser>(`/users/${username}`)
  const repos: GitHubRepo[] = []
  for (let page = 1; repos.length < MAX_REPOS; page++) {
    const batch = await gh<GitHubRepo[]>(`/users/${username}/repos?type=owner&per_page=100&page=${page}`)
    repos.push(...batch)
    if (batch.length < 100) break
  }

  const ranked = repos.map((r) => ({ r, s: quickScore(r) })).sort((a, b) => b.s - a.s)
  const deep = ranked.slice(0, MAX_DEEP)
  const rest = ranked.slice(MAX_DEEP)

  const profileLines = [
    `Name: ${user.name ?? user.login}`,
    user.bio && `Bio: ${user.bio}`,
    user.company && `Company: ${user.company}`,
    user.location && `Location: ${user.location}`,
    user.email && `Email: ${user.email}`,
    user.blog && `Website: ${user.blog}`,
    user.twitter_username && `X: https://x.com/${user.twitter_username}`,
    `GitHub: ${user.html_url}`,
  ].filter(Boolean) as string[]

  const sources: IngestedSource[] = [
    {
      kind: "github",
      label: `GitHub profile: ${user.login}`,
      raw_text: profileLines.join("\n"),
      url: user.html_url,
      dedupe_key: `profile:${user.login.toLowerCase()}`,
      meta: { login: user.login },
    },
  ]

  const deepSources = await Promise.all(
    deep.map(async ({ r, s }) => {
      const [readme, languages, contributors, userCommits, manifests] = await Promise.all([
        raw(`/repos/${r.full_name}/readme`).then((t) => t?.slice(0, MAX_README_CHARS) ?? ""),
        gh<Record<string, number>>(`/repos/${r.full_name}/languages`).catch(() => ({})),
        count(`/repos/${r.full_name}/contributors?anon=0`),
        count(`/repos/${r.full_name}/commits?author=${user.login}`),
        Promise.all(MANIFESTS.map(async (f) => [f, await raw(`/repos/${r.full_name}/contents/${f}`)] as const)),
      ])
      const langs = Object.entries(languages)
        .sort((a, b) => b[1] - a[1])
        .map(([l]) => l)
        .slice(0, 6)
      const deps = [...new Set(manifests.flatMap(([f, t]) => (t ? parseDeps(f, t) : [])))]
      const solo = contributors === 1 && userCommits != null && userCommits > 0 && !r.fork

      const signalLines: SignalFact[] = []
      const tech = [...langs, ...deps.filter((d) => !langs.includes(d))]
      if (tech.length) signalLines.push({ text: `Built with ${tech.join(", ")}`, quote: `Tech: ${tech.join(", ")}` })
      if (r.homepage) signalLines.push({ text: `Deployed at ${r.homepage}`, quote: `Live: ${r.homepage}` })
      if (r.stargazers_count >= 5) signalLines.push({ text: `${r.stargazers_count} GitHub stars`, quote: `Stars: ${r.stargazers_count}` })
      if (solo) signalLines.push({ text: "Solo project", quote: "Contributors: 1 (solo)" })

      const lines = [
        `Repository: ${r.name}`,
        r.description && `Description: ${r.description}`,
        tech.length && `Tech: ${tech.join(", ")}`,
        r.topics?.length && `Topics: ${r.topics.join(", ")}`,
        `Stars: ${r.stargazers_count}`,
        `Forks: ${r.forks_count}`,
        `Last pushed: ${r.pushed_at.slice(0, 10)}`,
        r.homepage && `Live: ${r.homepage}`,
        solo ? "Contributors: 1 (solo)" : contributors == null ? "Contributors: unknown (could not check)" : `Contributors: ${contributors}${contributors > 1 ? " (team)" : " (ownership unconfirmed)"}`,
        `Commits by ${user.login}: ${userCommits ?? "unknown (could not check)"}`,
        r.fork && "This repository is a fork.",
        `URL: ${r.html_url}`,
        readme && `README:\n${readme}`,
      ].filter(Boolean)

      const meta: RepoMeta = {
        repo_id: r.id, name: r.name, stars: r.stargazers_count, forks: r.forks_count, is_fork: r.fork,
        archived: r.archived, homepage: r.homepage, pushed_at: r.pushed_at, languages: langs, deps,
        contributors, user_commits: userCommits, score: s, signals: signalLines,
      }
      return {
        kind: "github",
        label: `GitHub repo: ${r.name}`,
        raw_text: lines.join("\n"),
        url: r.html_url,
        dedupe_key: `repo:${r.id}`,
        meta: meta as unknown as Record<string, unknown>,
      } satisfies IngestedSource
    })
  )
  sources.push(...deepSources)

  if (rest.length) {
    sources.push({
      kind: "github",
      label: `Other GitHub repos (${rest.length})`,
      raw_text: rest
        .map(({ r }) => `${r.name}${r.fork ? " (fork)" : ""}: ${r.description ?? "no description"}${r.language ? ` [${r.language}]` : ""}`)
        .join("\n"),
      url: `${user.html_url}?tab=repositories`,
      dedupe_key: `others:${user.login.toLowerCase()}`,
      meta: { count: rest.length },
    })
  }

  return unverified ? sources.map((s) => ({ ...s, meta: { ...s.meta, unverified: true } })) : sources
}

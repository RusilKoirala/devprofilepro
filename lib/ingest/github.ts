import type { SourceDoc } from "@/lib/resume/schema"

const API = "https://api.github.com"
const MAX_READMES = 8
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
  public_repos: number
  followers: number
  html_url: string
  created_at: string
}

interface GitHubRepo {
  name: string
  full_name: string
  description: string | null
  language: string | null
  stargazers_count: number
  forks_count: number
  fork: boolean
  archived: boolean
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

function headers(accept = "application/vnd.github+json"): HeadersInit {
  const h: Record<string, string> = {
    Accept: accept,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "devprofile-pro",
  }
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  return h
}

async function gh<T>(path: string, revalidate = 600): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: headers(), next: { revalidate } })
  if (res.status === 404) throw new GitHubError("GitHub user not found", 404)
  if (res.status === 403 || res.status === 429)
    throw new GitHubError("GitHub rate limit hit — set GITHUB_TOKEN to raise it", res.status)
  if (!res.ok) throw new GitHubError(`GitHub API error (${res.status})`, res.status)
  return res.json() as Promise<T>
}

async function readme(fullName: string): Promise<string> {
  const res = await fetch(`${API}/repos/${fullName}/readme`, {
    headers: headers("application/vnd.github.raw+json"),
    next: { revalidate: 3600 },
  })
  if (!res.ok) return ""
  return (await res.text()).slice(0, MAX_README_CHARS)
}

export function normalizeGitHubUsername(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\/(www\.)?github\.com\//i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0]
}

// Rank by stars, with a boost for recently pushed repos so current work shows up.
function score(repo: GitHubRepo): number {
  const ageDays = (Date.now() - new Date(repo.pushed_at).getTime()) / 86_400_000
  const recency = Math.max(0, 1 - ageDays / 365)
  return repo.stargazers_count * 2 + repo.forks_count + recency * 5 + (repo.description ? 1 : 0)
}

// Cheap change signal: repo count + the most recent push times.
export async function githubFingerprint(username: string): Promise<string> {
  const repos = await gh<GitHubRepo[]>(
    `/users/${username}/repos?per_page=5&sort=pushed&type=owner`,
    0
  )
  return [repos.length, ...repos.map((r) => `${r.name}@${r.pushed_at}`)].join("|")
}

export async function ingestGitHub(
  rawUsername: string
): Promise<{ docs: SourceDoc[]; fingerprint: string }> {
  const username = normalizeGitHubUsername(rawUsername)
  const [user, repos] = await Promise.all([
    gh<GitHubUser>(`/users/${username}`),
    gh<GitHubRepo[]>(`/users/${username}/repos?per_page=100&sort=pushed&type=owner`),
  ])

  const own = repos.filter((r) => !r.fork && !r.archived)
  const languageCounts = new Map<string, number>()
  for (const r of own) {
    if (r.language) languageCounts.set(r.language, (languageCounts.get(r.language) ?? 0) + 1)
  }
  const languages = [...languageCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([lang, n]) => `${lang} (${n} repos)`)
  const totalStars = own.reduce((sum, r) => sum + r.stargazers_count, 0)

  const docs: SourceDoc[] = [
    {
      source: "github",
      title: `GitHub profile: ${user.login}`,
      url: user.html_url,
      text: [
        `Name: ${user.name ?? user.login}`,
        user.bio && `Bio: ${user.bio}`,
        user.company && `Company: ${user.company}`,
        user.location && `Location: ${user.location}`,
        user.email && `Email: ${user.email}`,
        user.blog && `Website: ${user.blog}`,
        user.twitter_username && `X: https://x.com/${user.twitter_username}`,
        `GitHub: ${user.html_url}`,
        `Public repos: ${user.public_repos}, followers: ${user.followers}, total stars on own repos: ${totalStars}`,
        `Languages used across repositories: ${languages.join(", ")}`,
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ]

  const top = [...own].sort((a, b) => score(b) - score(a))
  const withReadmes = top.slice(0, MAX_READMES)
  const readmes = await Promise.all(withReadmes.map((r) => readme(r.full_name)))

  top.slice(0, 25).forEach((repo, i) => {
    const lines = [
      `Repository: ${repo.name}`,
      repo.description && `Description: ${repo.description}`,
      repo.language && `Primary language: ${repo.language}`,
      repo.topics?.length && `Topics: ${repo.topics.join(", ")}`,
      `Stars: ${repo.stargazers_count}, forks: ${repo.forks_count}, last pushed: ${repo.pushed_at.slice(0, 10)}`,
      repo.homepage && `Live: ${repo.homepage}`,
      `URL: ${repo.html_url}`,
      readmes[i] && `README:\n${readmes[i]}`,
    ]
    docs.push({
      source: "github",
      title: `GitHub repo: ${repo.name}`,
      url: repo.html_url,
      text: lines.filter(Boolean).join("\n"),
    })
  })

  const fingerprint = [
    repos.length,
    ...repos.slice(0, 5).map((r) => `${r.name}@${r.pushed_at}`),
  ].join("|")

  return { docs, fingerprint }
}

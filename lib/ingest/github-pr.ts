import "server-only"
import { githubTokenFor } from "@/lib/ingest/github"
import type { IngestedSource } from "@/lib/ingest/types"

interface PullRequest {
  html_url: string
  title: string
  body: string | null
  merged_at: string | null
  additions: number
  deletions: number
  changed_files: number
  user: { login: string }
  base: { repo: { full_name: string; description: string | null; stargazers_count: number } }
}

const PR_URL = /github\.com\/([\w.-]+)\/([\w.-]+)\/pull\/(\d+)/i

export async function ingestPullRequests(userId: string, urls: string[]): Promise<{ sources: IngestedSource[]; rejected: { url: string; reason: string }[] }> {
  const { token, login } = await githubTokenFor(userId)
  const sources: IngestedSource[] = []
  const rejected: { url: string; reason: string }[] = []

  for (const url of urls.slice(0, 20)) {
    const m = url.match(PR_URL)
    if (!m) {
      rejected.push({ url, reason: "Not a GitHub pull request link" })
      continue
    }
    const res = await fetch(`https://api.github.com/repos/${m[1]}/${m[2]}/pulls/${m[3]}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "devprofile-pro",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    })
    if (!res.ok) {
      rejected.push({ url, reason: `GitHub returned ${res.status}` })
      continue
    }
    const pr = (await res.json()) as PullRequest
    if (!pr.merged_at) {
      rejected.push({ url, reason: "Not merged" })
      continue
    }
    if (!login || pr.user.login.toLowerCase() !== login.toLowerCase()) {
      rejected.push({ url, reason: login ? `Opened by ${pr.user.login}, not you` : "Sign in with GitHub to prove this PR is yours" })
      continue
    }
    const repo = pr.base.repo
    sources.push({
      kind: "pr_link",
      label: `PR: ${repo.full_name}#${m[3]}`,
      url: pr.html_url,
      dedupe_key: pr.html_url.toLowerCase(),
      raw_text: [
        `Merged pull request to ${repo.full_name}`,
        repo.description && `Repository description: ${repo.description}`,
        `Repository stars: ${repo.stargazers_count}`,
        `Title: ${pr.title}`,
        `Merged: ${pr.merged_at.slice(0, 10)}`,
        `Changes: +${pr.additions} -${pr.deletions} in ${pr.changed_files} files`,
        pr.body && `Description:\n${pr.body.slice(0, 4000)}`,
      ]
        .filter(Boolean)
        .join("\n"),
      meta: { repo: repo.full_name, additions: pr.additions, deletions: pr.deletions, merged_at: pr.merged_at },
    })
  }
  return { sources, rejected }
}

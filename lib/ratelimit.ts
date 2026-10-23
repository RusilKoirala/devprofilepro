import "server-only"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import type { AiStep } from "@/lib/ai/model"

// Daily caps per user during beta. Editing, checks and downloads are never limited.
const DAILY_LIMITS: Record<AiStep, number> = {
  transcribe: 10,
  extract: 10,
  questions: 20,
  write: 40,
  tailor: 20,
  win: 30,
}

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? Redis.fromEnv() : null

const limiters = new Map<AiStep, Ratelimit>()

function limiter(step: AiStep) {
  if (!redis) return null
  let l = limiters.get(step)
  if (!l) {
    l = new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(DAILY_LIMITS[step], "1 d"), prefix: `rl:${step}` })
    limiters.set(step, l)
  }
  return l
}

export class RateLimitedError extends Error {
  constructor(public step: AiStep, public reset: number) {
    super(`Daily limit reached for ${step}. Your resume still works; try again tomorrow.`)
  }
}

export async function checkLimit(userId: string, step: AiStep) {
  const l = limiter(step)
  if (!l) return
  const res = await l.limit(userId)
  if (!res.success) throw new RateLimitedError(step, res.reset)
}

// For showing "N left today" before the user clicks.
export async function remaining(userId: string, step: AiStep): Promise<number | null> {
  const l = limiter(step)
  if (!l) return null
  return (await l.getRemaining(userId)).remaining
}

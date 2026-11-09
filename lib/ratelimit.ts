import "server-only"
import { Ratelimit } from "@upstash/ratelimit"
import type { AiStep } from "@/lib/ai/model"
import { redis } from "@/lib/redis"

const DAILY_LIMITS: Record<AiStep, number> = {
  transcribe: 10,
  extract: 10,
  questions: 20,
  write: 40,
  tailor: 20,
  win: 30,
  chat: 80,
}

const PRO_FACTOR = 3
const limiters = new Map<string, Ratelimit>()

function limiter(step: AiStep, pro = false) {
  if (!redis) return null
  const key = `${pro ? "pro:" : ""}${step}`
  let l = limiters.get(key)
  if (!l) {
    l = new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(DAILY_LIMITS[step] * (pro ? PRO_FACTOR : 1), "1 d"), prefix: `rl:${key}` })
    limiters.set(key, l)
  }
  return l
}

export class RateLimitedError extends Error {
  constructor(public step: AiStep, public reset: number) {
    super(`Daily limit reached for ${step}. Your resume still works; try again tomorrow.`)
  }
}

export async function checkLimit(userId: string, step: AiStep, pro = false) {
  const l = limiter(step, pro)
  if (!l) return
  const res = await l.limit(userId)
  if (!res.success) throw new RateLimitedError(step, res.reset)
}

export async function remaining(userId: string, step: AiStep): Promise<number | null> {
  const l = limiter(step)
  if (!l) return null
  return (await l.getRemaining(userId)).remaining
}

const publicLimiters = new Map<string, Ratelimit>()
const memoryHits = new Map<string, { day: string; n: number }>()

export async function allowPublic(tool: string, ip: string, perDay: number): Promise<boolean> {
  if (redis) {
    let l = publicLimiters.get(tool)
    if (!l) {
      l = new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(perDay, "1 d"), prefix: `rl:public:${tool}` })
      publicLimiters.set(tool, l)
    }
    return (await l.limit(ip)).success
  }
  const day = new Date().toISOString().slice(0, 10)
  const key = `${tool}:${ip}`
  const hit = memoryHits.get(key)
  const n = hit?.day === day ? hit.n + 1 : 1
  memoryHits.set(key, { day, n })
  return n <= perDay
}

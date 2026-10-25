import "server-only"
import { Redis } from "@upstash/redis"

// Shared by every server instance when Upstash is configured: rate limits and the server-wide
// AI budget. Null otherwise, and callers fall back to per-process memory.
export const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? Redis.fromEnv() : null

export function isAppEnabled() {
  return process.env.APP_ENABLED === "true"
}

export const PUBLIC_PATHS = new Set(["/", "/pricing", "/privacy", "/terms", "/ats-checker", "/api/ats-check", "/api/waitlist", "/api/webhooks/dodo", "/api/webhooks/clerk"])

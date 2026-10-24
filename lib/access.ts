// Early access: until APP_ENABLED=true is set in the env, only the landing and pricing pages
// and the waitlist API exist. Everything else answers 404.
export function isAppEnabled() {
  return process.env.APP_ENABLED === "true"
}

export const PUBLIC_PATHS = new Set(["/", "/pricing", "/ats-checker", "/api/ats-check", "/api/waitlist", "/api/webhooks/dodo"])

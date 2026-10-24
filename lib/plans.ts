// Plans and their monthly allowances (docs/PRICING.md section 3). The only place to change them.
// Editing, checks, answering questions and downloads are never counted.

export type PlanId = "free" | "pro"
export type Allowance = "tailored" | "fixes" | "updates"

export const PLANS: Record<PlanId, { name: string; limits: Record<Allowance, number | null> }> = {
  // null = unlimited (fair use, see the cost ceiling in docs/PRICING.md section 5).
  free: { name: "Free", limits: { tailored: 3, fixes: 20, updates: 2 } },
  pro: { name: "Pro", limits: { tailored: null, fixes: null, updates: null } },
}

export const ALLOWANCE_LABELS: Record<Allowance, { title: string; unit: string; units: string }> = {
  tailored: { title: "Tailored resumes", unit: "tailored resume", units: "tailored resumes" },
  fixes: { title: "AI fixes and chat edits", unit: "AI fix", units: "AI fixes" },
  updates: { title: "Builds and source syncs", unit: "update", units: "updates" },
}

export const PRO_PRICE = { monthly: 12, pass: 29 }

// Downloads Free sees on the dashboard. Older files stay stored and reappear with Pro.
export const FREE_HISTORY = 3

export interface PlanUsage {
  plan: PlanId
  // Set on Pro: how they pay and until when Pro is guaranteed.
  billing?: { source: "monthly" | "pass"; periodEnd: string; cancelAtPeriodEnd: boolean; pastDue: boolean }
  used: Record<Allowance, number>
  // Start of the next month (UTC), when Free allowances refill.
  resetsAt: string
  // A query failed: the numbers (and maybe the plan) can't be trusted, so say so instead of showing 0.
  unavailable?: boolean
}

export interface AllowanceState {
  key: Allowance
  used: number
  limit: number | null
  left: number | null
  // "ok" under 2/3 used, "low" with one or two left, "out" when none are left.
  state: "ok" | "low" | "out"
}

export function allowanceStates(usage: PlanUsage): AllowanceState[] {
  const limits = PLANS[usage.plan].limits
  return (Object.keys(limits) as Allowance[]).map((key) => {
    const limit = limits[key]
    const used = usage.used[key]
    if (limit == null) return { key, used, limit, left: null, state: "ok" }
    const left = Math.max(0, limit - used)
    return { key, used, limit, left, state: left === 0 ? "out" : used / limit >= 2 / 3 ? "low" : "ok" }
  })
}

export function monthStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

export function nextMonthStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
}

// The line that makes the gap concrete, worst allowance first.
export function upgradeReason(states: AllowanceState[]): string | undefined {
  const worst = states.find((s) => s.state === "out") ?? states.find((s) => s.state === "low")
  if (!worst) return undefined
  const { units, unit } = ALLOWANCE_LABELS[worst.key]
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
  return worst.state === "out"
    ? `You've used all ${worst.limit} free ${units} this month.`
    : `Only ${plural(worst.left!, unit, units)} left on Free this month.`
}

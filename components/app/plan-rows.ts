import { FileStack, History, RefreshCw, Target, Wand2 } from "lucide-react"
import { FREE_HISTORY, PLANS } from "@/lib/plans"

const free = PLANS.free.limits

// Free next to Pro on every line, so the difference is concrete rather than a feature list.
export const PLAN_ROWS = [
  { icon: FileStack, title: "Tailored resumes", free: `${free.tailored} a month`, pro: "Unlimited" },
  { icon: Target, title: "Match report for each job", free: `${free.tailored} a month`, pro: "Every job" },
  { icon: Wand2, title: "AI fixes and chat edits", free: `${free.fixes} a month`, pro: "Unlimited" },
  { icon: RefreshCw, title: "GitHub and LinkedIn syncs", free: `${free.updates} a month`, pro: "Anytime" },
  { icon: History, title: "What you sent where", free: `Last ${FREE_HISTORY}`, pro: "Forever" },
]

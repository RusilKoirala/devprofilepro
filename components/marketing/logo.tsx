import Link from "next/link"
import { cn } from "@/lib/utils"

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={cn("size-6", className)}>
      <rect x="2" y="2" width="20" height="20" rx="6" className="fill-foreground" />
      <path
        d="M8 9h8M8 12.5h8M8 16h5"
        className="stroke-background"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-2.5 rounded-md text-[17px] font-semibold tracking-tight focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        className
      )}
    >
      <LogoMark />
      DevProfile
    </Link>
  )
}

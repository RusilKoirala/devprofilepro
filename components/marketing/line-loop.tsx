"use client"

import LogoLoop, { type LogoItem } from "@/components/LogoLoop"

const lines = [
  "Shipped offline sync for 40k weekly users",
  "Cut p95 load time 48% with cursor pagination",
  "Built a CRDT sync engine adopted by 30+ apps",
  "Led the React Native new-architecture migration",
  "Grew a lint plugin to 60k weekly downloads",
  "Mentored 4 interns; two returned full-time",
]

const items: LogoItem[] = lines.map((line) => ({
  node: (
    <span className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm whitespace-nowrap text-muted-foreground">
      <span className="size-1.5 rounded-full bg-foreground/30" aria-hidden="true" />
      {line}
    </span>
  ),
  title: line,
}))

export function LineLoop() {
  return (
    <div className="py-10">
      <p className="mb-6 text-center text-sm text-muted-foreground">The kind of lines it writes, from your own work</p>
      <LogoLoop
        logos={items}
        speed={40}
        gap={12}
        logoHeight={40}
        pauseOnHover
        fadeOut
        fadeOutColor="var(--background)"
        intro={false}
        ariaLabel="Example resume lines"
      />
    </div>
  )
}

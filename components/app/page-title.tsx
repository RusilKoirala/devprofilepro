"use client"

import { usePathname } from "next/navigation"

const TITLES: [prefix: string, title: string][] = [
  ["/home", "Dashboard"],
  ["/resume/", "Resume"],
  ["/resume", "Resumes"],
  ["/record", "Career Record"],
  ["/start", "Add sources"],
]

export function PageTitle() {
  const pathname = usePathname()
  return <h1 className="text-[15px] font-medium">{TITLES.find(([p]) => pathname.startsWith(p))?.[1] ?? "DevProfile"}</h1>
}

"use client"

import { siAirbnb, siOpenai, siRevolut, siCloudflare, siDatadog, siDiscord, siDuolingo, siFigma, siGoogle, siLinear, siNetflix, siNotion, siNvidia, siShopify, siSpotify, siStripe, siSupabase, siVercel, type SimpleIcon } from "simple-icons"
import { Cycler } from "./cycler"

// Where people point their resumes. The whole row turns together. Framed as roles you can tailor for, never as placements:
// we don't claim anyone was hired anywhere.
const COLUMNS: SimpleIcon[][] = [
  [siGoogle, siNvidia, siDiscord],
  [siStripe, siRevolut, siDatadog],
  [siVercel, siSupabase, siCloudflare],
  [siSpotify, siDuolingo, siAirbnb],
  [siFigma, siLinear, siNotion],
  [siShopify, siNetflix, siOpenai],
]

function Logo({ icon }: { icon: SimpleIcon }) {
  return (
    <span className="inline-flex items-center gap-2 text-[1.35rem] font-semibold tracking-[-0.03em] whitespace-nowrap">
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[1.1em] fill-current"><path d={icon.path} /></svg>
      {icon.title}
    </span>
  )
}

export function CompanyStrip() {
  return (
    <section aria-label="Companies you can tailor for" className="px-4 py-14 sm:px-6">
      <p className="text-center text-sm text-muted-foreground">Tailor your resume for roles at</p>
      <div className="mx-auto mt-7 grid max-w-5xl grid-cols-2 justify-items-center gap-x-6 gap-y-6 text-foreground/35 sm:grid-cols-3 lg:grid-cols-6">
        {COLUMNS.map((column, i) => (
          <Cycler key={i} items={column.map((icon) => <Logo key={icon.slug} icon={icon} />)} interval={3200} className="h-9" />
        ))}
      </div>
    </section>
  )
}

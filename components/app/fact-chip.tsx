"use client"

import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export interface FactView {
  id: string
  text: string
  label: "github" | "document" | "user"
  quote: string | null
  source: string | null
  url: string | null
}

export const LABEL_TEXT: Record<FactView["label"], string> = {
  github: "From GitHub",
  document: "From your documents",
  user: "You told us",
}

// The Proof Trail: click a chip to see the exact quote and where it came from.
export function FactChip({ fact }: { fact: FactView }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button">
          <Badge variant="secondary" className="cursor-pointer text-[10px] font-normal">{LABEL_TEXT[fact.label]}</Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-2 text-sm">
        <div className="font-medium">{fact.text}</div>
        {fact.quote && <blockquote className="border-l-2 border-border pl-3 text-muted-foreground">“{fact.quote}”</blockquote>}
        <div className="text-xs text-muted-foreground">
          {fact.label === "user" ? "You told us this." : (
            <>Source: {fact.url ? <a href={fact.url} target="_blank" rel="noreferrer" className="underline underline-offset-4">{fact.source}</a> : fact.source}</>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

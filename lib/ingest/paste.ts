import { createHash } from "node:crypto"
import type { IngestedSource } from "@/lib/ingest/types"

export const MAX_PASTE_CHARS = 20_000

  export function ingestPaste(text: string, label = "Pasted notes"): IngestedSource {
  const trimmed = text.trim()
 if (!trimmed) throw new Error("Nothing pasted")
  if ( /^https?:\/\/\S+$/.test(trimmed)) {
    throw new Error("Paste the page's text instead of its link. We don't fetch web pages yet.")
  }
  if (trimmed.length > MAX_PASTE_CHARS) throw new Error(`Paste is over ${MAX_PASTE_CHARS.toLocaleString()} characters`)
  return {
    kind: "paste",
    label,
    raw_text: trimmed,
    dedupe_key: createHash("sha256").update(trimmed).digest("hex"),



 }
}

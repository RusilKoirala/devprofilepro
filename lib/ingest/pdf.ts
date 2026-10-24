import "server-only"
import { createHash } from "node:crypto"
import { extractLinks, extractText, getDocumentProxy } from "unpdf"
import { transcribePdf } from "@/lib/ai/transcribe"
import type { IngestedSource } from "@/lib/ingest/types"
import { createClient } from "@/lib/supabase/server"

import { MAX_PDF_BYTES } from "@/lib/ingest/limits"

export { MAX_PDF_BYTES }
const MIN_TEXT_CHARS = 200

export function cleanPdfText(text: string): string {
  return text
    .replace(/ﬁ/g, "fi")
    .replace(/ﬂ/g, "fl")
    .replace(/ﬀ/g, "ff")
    .replace(/ﬃ/g, "ffi")
    .replace(/ﬄ/g, "ffl")
    .replace(/(\w)-\n(\w)/g, "$1$2") // join hyphenated line breaks
    .replace(/^[ \t]*[•●▪◦‣∙·•]\s*/gm, "- ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export function looksLikeLinkedIn(text: string): boolean {
  return /linkedin\.com\/in\//i.test(text) && /\b(Top Skills|Experience)\b/.test(text) && /\bSummary\b|\bContact\b/.test(text)
}

export async function ingestPdf(userId: string, file: File): Promise<IngestedSource> {
  if (file.type !== "application/pdf") throw new Error(`${file.name} is not a PDF`)
  if (file.size > MAX_PDF_BYTES) throw new Error(`${file.name} is over 5 MB`)

  const bytes = new Uint8Array(await file.arrayBuffer())
  const hash = createHash("sha256").update(bytes).digest("hex")

  const supabase = await createClient()
  const path = `${userId}/${hash}.pdf`
  const { error: uploadError } = await supabase.storage.from("uploads").upload(path, bytes, { contentType: "application/pdf", upsert: true })
  if (uploadError) throw new Error(`Couldn't save ${file.name}: ${uploadError.message}`)

  // unpdf takes ownership of the buffer, so give it a copy. A file that can't be parsed isn't kept.
  let parsed: [{ text: string; totalPages: number }, { links: string[] }]
  try {
    const pdf = await getDocumentProxy(bytes.slice())
    parsed = await Promise.all([extractText(pdf, { mergePages: true }), extractLinks(pdf).catch(() => ({ links: [] as string[] }))])
  } catch {
    await supabase.storage.from("uploads").remove([path])
    throw new Error(`${file.name} couldn't be opened as a PDF. Is it damaged or password-protected?`)
  }
  const [{ text, totalPages }, { links }] = parsed
  let raw = cleanPdfText(text)
  let status: IngestedSource["status"] = "ok"
  let transcribed = false

  if (raw.length < MIN_TEXT_CHARS) {
    try {
      raw = cleanPdfText(await transcribePdf(userId, bytes))
      if (!raw) throw new Error("No text found in PDF")
      transcribed = true
      status = "partial"
    } catch {
      status = "failed"
    }
  }

  const uniqueLinks = [...new Set(links)].filter((l) => /^https?:|^mailto:/i.test(l))
  if (uniqueLinks.length) raw += `\n\nLinks in this document:\n${uniqueLinks.join("\n")}`

  return {
    kind: looksLikeLinkedIn(raw) ? "linkedin_pdf" : "resume_pdf",
    label: file.name,
    raw_text: raw,
    file_path: path,
    dedupe_key: hash,
    status,
    meta: { pages: totalPages, transcribed, links: uniqueLinks },
  }
}

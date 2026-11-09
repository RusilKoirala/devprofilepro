import "server-only"
import { z } from "zod"
import { generate } from "@/lib/ai/client"

const TranscriptSchema = z.object({ text: z.string() })

export async function transcribePdf(userId: string, pdf: Uint8Array): Promise<string> {
  const { text } = await generate({
    step: "transcribe",
    userId,
    schema: TranscriptSchema,
    effort: "low",
    system:
      "You transcribe resumes and LinkedIn exports. Transcribe the document exactly as written, in reading order. Do not fix, add, reorder or summarise anything. Put each bullet on its own line starting with '- '.",
    content: [
      { type: "pdf", base64: Buffer.from(pdf).toString("base64"), filename: "resume.pdf" },
      { type: "text", text: "Transcribe this document." },
    ],
  })
  return text
}

import "server-only"
import { createElement } from "react"
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer"
import { extractText, getDocumentProxy } from "unpdf"
import { ResumePdf } from "@/lib/resume/pdf/Template"
import type { ResumeDoc } from "@/lib/resume/schema"

export async function renderPdf(doc: ResumeDoc): Promise<Uint8Array> {
  const element = createElement(ResumePdf, { doc }) as unknown as React.ReactElement<DocumentProps>
  return new Uint8Array(await renderToBuffer(element))
}

export async function pageCount(pdf: Uint8Array): Promise<number> {
  return (await getDocumentProxy(pdf.slice())).numPages
}

// "What an applicant-tracking system reads from your file": the text of the actual PDF.
export async function parserView(pdf: Uint8Array): Promise<string> {
  const { text } = await extractText(await getDocumentProxy(pdf.slice()), { mergePages: true })
  return text
}

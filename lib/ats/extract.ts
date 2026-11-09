import "server-only"
import { extractLinks, extractText, getDocumentProxy } from "unpdf"
import type { ExtractedPdf, PdfLine } from "@/lib/ats/analyze"

export const MAX_ATS_PDF_BYTES = 5 * 1024 * 1024
const MAX_PAGES = 10

export async function extractPdf(bytes: Uint8Array): Promise<ExtractedPdf> {
  const pdf = await getDocumentProxy(bytes.slice())
  const pages = pdf.numPages
  const lines: PdfLine[] = []
  for (let p = 1; p <= Math.min(pages, MAX_PAGES); p++) {
    const page = await pdf.getPage(p)
    const width = page.getViewport({ scale: 1 }).width || 612
    const { items } = await page.getTextContent()
    const byRow = new Map<number, { x: number; str: string }[]>()
    for (const item of items) {
      if (!("str" in item) || !item.str.trim()) continue
      const [, , , , x, y] = item.transform as number[]
      const row = [...byRow.keys()].find((k) => Math.abs(k - y) <= 2) ?? y
      byRow.set(row, [...(byRow.get(row) ?? []), { x: x / width, str: item.str }])
    }
    for (const [, runs] of [...byRow].sort((a, b) => b[0] - a[0])) {
      runs.sort((a, b) => a.x - b.x)
      lines.push({ page: p, xs: runs.map((r) => r.x), runs: runs.map((r) => r.str) })
    }
  }
  const [{ text }, { links }] = await Promise.all([extractText(pdf, { mergePages: true }), extractLinks(pdf).catch(() => ({ links: [] as string[] }))])
  return { pages, text, lines, links }
}

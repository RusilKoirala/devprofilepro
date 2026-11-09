import "server-only"
import type { CareerRecord } from "@/lib/record/db"
import { itemTitle, type CutEntry, type Item, type ResumeLayout } from "@/lib/record/types"
import { buildResume } from "@/lib/resume/build"
import { pageCount, renderPdf } from "@/lib/resume/render"

export interface FitResult {
  layout: ResumeLayout
  cuts: CutEntry[]
  pages: number
  pdf: Uint8Array
  pinnedOverflow: boolean
}

const MAX_STEPS = 60
const SIZES = [11.5, 11, 10.5]

export async function fitToOnePage(layout: ResumeLayout, record: Pick<CareerRecord, "items" | "bullets">, relevance?: string[]): Promise<FitResult> {
  const items = new Map(record.items.map((i) => [i.id, i]))
  const weight = weigher(relevance)
  const current: ResumeLayout = { ...layout, items: layout.items.map((li) => ({ ...li, bullet_ids: [...li.bullet_ids] })) }
  const cuts: CutEntry[] = []

  for (const size of SIZES) {
    const pdf = await renderPdf(buildResume({ ...current, font_size: size }, record))
    if ((await pageCount(pdf)) <= 1) return { layout: { ...current, font_size: size }, cuts, pages: 1, pdf, pinnedOverflow: false }
  }
  delete current.font_size

  for (let step = 0; step < MAX_STEPS; step++) {
    const pdf = await renderPdf(buildResume(current, record))
    const pages = await pageCount(pdf)
    if (pages <= 1) return { layout: current, cuts: explain(cuts, current, items, weight), pages, pdf, pinnedOverflow: false }

    const candidates = current.items
      .map((li) => ({ li, item: items.get(li.item_id) }))
      .filter(({ item }) => item && !item.pinned && item.type !== "contact")
      .sort((a, b) => weight(a.item!) - weight(b.item!))
    const target = candidates[0]
    if (!target) return { layout: current, cuts: explain(cuts, current, items, weight), pages, pdf, pinnedOverflow: true }

    if (target.li.bullet_ids.length > 1) {
      const bulletId = target.li.bullet_ids.pop()!
      cuts.push({ item_id: target.li.item_id, bullet_id: bulletId, reason: "" })
    } else {
      current.items = current.items.filter((li) => li !== target.li)
      for (let i = cuts.length - 1; i >= 0; i--) if (cuts[i].item_id === target.li.item_id) cuts.splice(i, 1)
      cuts.push({ item_id: target.li.item_id, reason: "" })
    }
  }
  const pdf = await renderPdf(buildResume(current, record))
  return { layout: current, cuts: explain(cuts, current, items, weight), pages: await pageCount(pdf), pdf, pinnedOverflow: false }
}

function explain(cuts: CutEntry[], layout: ResumeLayout, items: Map<string, Item>, weight: (item: Item) => number): CutEntry[] {
  const onPage = layout.items.map((li) => items.get(li.item_id)).filter((i): i is Item => !!i).sort((a, b) => weight(a) - weight(b))
  return cuts.map((c) => {
    const type = items.get(c.item_id)?.type
    const other = onPage.find((i) => i.type === type && i.id !== c.item_id)
    const what = c.bullet_id ? "Bullet cut" : "Cut"
    const ranked = weight === rankWeight ? "Ranked below" : "Less relevant to this job than"
    return { ...c, reason: other ? `${what} to fit one page. ${ranked} "${itemTitle(other)}".` : `${what} to fit one page. Lowest ranked content.` }
  })
}

const keepLast = (item: { type: string }) => (item.type === "education" || item.type === "skills" ? 1000 : 0)
const rankWeight = (item: { id: string; type: string; rank: number }) => item.rank + keepLast(item)

export function weigher(relevance?: string[]): (item: { id: string; type: string; rank: number }) => number {
  if (!relevance?.length) return rankWeight
  const position = new Map(relevance.map((id, n) => [id, n]))
  return (item) => (position.has(item.id) ? 100 - (position.get(item.id)! * 100) / relevance.length : -1) + keepLast(item)
}

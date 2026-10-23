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
  // Pinned content alone doesn't fit: we stop and let the user decide.
  pinnedOverflow: boolean
}

const MAX_STEPS = 60

// Render, count pages, and remove the weakest unpinned content until it fits on one page.
export async function fitToOnePage(layout: ResumeLayout, record: Pick<CareerRecord, "items" | "bullets">): Promise<FitResult> {
  const items = new Map(record.items.map((i) => [i.id, i]))
  const current: ResumeLayout = { ...layout, items: layout.items.map((li) => ({ ...li, bullet_ids: [...li.bullet_ids] })) }
  const cuts: CutEntry[] = []

  for (let step = 0; step < MAX_STEPS; step++) {
    const pdf = await renderPdf(buildResume(current, record))
    const pages = await pageCount(pdf)
    if (pages <= 1) return { layout: current, cuts: explain(cuts, current, items), pages, pdf, pinnedOverflow: false }

    // Weakest unpinned item that still has something to cut (skills/education are cut last).
    const candidates = current.items
      .map((li) => ({ li, item: items.get(li.item_id) }))
      .filter(({ item }) => item && !item.pinned && item.type !== "contact")
      .sort((a, b) => weight(a.item!) - weight(b.item!))
    const target = candidates[0]
    if (!target) return { layout: current, cuts: explain(cuts, current, items), pages, pdf, pinnedOverflow: true }

    if (target.li.bullet_ids.length > 1) {
      const bulletId = target.li.bullet_ids.pop()!
      cuts.push({ item_id: target.li.item_id, bullet_id: bulletId, reason: "" })
    } else {
      current.items = current.items.filter((li) => li !== target.li)
      // The whole item went, so its earlier bullet cuts collapse into one entry.
      for (let i = cuts.length - 1; i >= 0; i--) if (cuts[i].item_id === target.li.item_id) cuts.splice(i, 1)
      cuts.push({ item_id: target.li.item_id, reason: "" })
    }
  }
  const pdf = await renderPdf(buildResume(current, record))
  return { layout: current, cuts: explain(cuts, current, items), pages: await pageCount(pdf), pdf, pinnedOverflow: false }
}

// Each cut names the weakest item of the same kind that stayed on the final page.
function explain(cuts: CutEntry[], layout: ResumeLayout, items: Map<string, Item>): CutEntry[] {
  const onPage = layout.items.map((li) => items.get(li.item_id)).filter((i): i is Item => !!i).sort((a, b) => a.rank - b.rank)
  return cuts.map((c) => {
    const type = items.get(c.item_id)?.type
    const other = onPage.find((i) => i.type === type && i.id !== c.item_id)
    const what = c.bullet_id ? "Bullet cut" : "Cut"
    return { ...c, reason: other ? `${what} to fit one page. Ranked below "${itemTitle(other)}".` : `${what} to fit one page. Lowest ranked content.` }
  })
}

function weight(item: { type: string; rank: number }) {
  // Never cut education or skills before projects and jobs.
  return item.rank + (item.type === "education" || item.type === "skills" ? 1000 : 0)
}

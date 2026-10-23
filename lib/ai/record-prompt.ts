import { itemTitle, type Bullet, type Fact, type Item } from "@/lib/record/types"

// The Career Record as compact text for prompts A2-A4. Raw sources are never re-read after A1.
export function recordForPrompt(items: Item[], facts: Fact[], bullets: Bullet[] = []): string {
  return items
    .map((item) => {
      const data = Object.fromEntries(Object.entries(item.data).filter(([, v]) => v != null && v !== ""))
      const itemFacts = facts.filter((f) => f.item_id === item.id)
      const itemBullets = bullets.filter((b) => b.item_id === item.id)
      return [
        `<item id="${item.id}" type="${item.type}" status="${item.status}" rank="${item.rank}"${item.pinned ? " pinned" : ""}>`,
        `${itemTitle(item)} ${JSON.stringify(data)}`,
        ...itemFacts.map((f) => `  <fact id="${f.id}" label="${f.label}"${f.approx ? " approx" : ""}>${f.text}</fact>`),
        ...itemBullets.map((b) => `  <bullet id="${b.id}" facts="${b.fact_ids.join(",")}"${b.user_edited ? " keep" : ""}>${b.text}</bullet>`),
        `</item>`,
      ].join("\n")
    })
    .join("\n\n")
}

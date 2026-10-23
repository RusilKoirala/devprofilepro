// Entries the user dragged keep their order; anything new stays where the default order put it.
// Pure code, so it can be unit tested.
export function applyItemOrder<T extends { item_id: string }>(items: T[], order: string[] | undefined): T[] {
  if (!order?.length) return items
  const index = new Map(order.map((id, n) => [id, n]))
  const known = items.filter((i) => index.has(i.item_id)).sort((a, b) => index.get(a.item_id)! - index.get(b.item_id)!)
  let next = 0
  return items.map((i) => (index.has(i.item_id) ? known[next++] : i))
}

// Replace one section's ids with their new order, keeping every other id in place.
export function reorderWithin(all: string[], section: string[]): string[] {
  const ids = new Set(section)
  let next = 0
  return all.map((id) => (ids.has(id) ? section[next++] : id))
}

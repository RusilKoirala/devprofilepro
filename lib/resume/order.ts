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

// The lines one resume shows for one item, in order. Shared lines first (each replaced by this
// resume's own version where it has one), then lines only this resume has. The base resume
// (no tailored resume id) shows shared lines only.
export function resumeBullets<B extends { id: string; item_id: string; resume_id?: string | null; replaces?: string | null }>(
  bullets: B[],
  itemId: string,
  resume?: { id: string; hidden_bullets?: string[]; own_items?: string[] } | null
): B[] {
  const shared = resume?.own_items?.includes(itemId) ? [] : bullets.filter((b) => b.item_id === itemId && !b.resume_id)
  const own = resume ? bullets.filter((b) => b.item_id === itemId && b.resume_id === resume.id) : []
  const hidden = new Set(resume?.hidden_bullets ?? [])
  const sharedIds = new Set(shared.map((b) => b.id))
  const replacing = new Map(own.filter((b) => b.replaces && sharedIds.has(b.replaces)).map((b) => [b.replaces!, b]))
  return [
    ...shared.filter((b) => !hidden.has(b.id)).map((b) => replacing.get(b.id) ?? b),
    ...own.filter((b) => !b.replaces || !sharedIds.has(b.replaces)),
  ]
}

// Shared Career Record wording only, for prompts and the base resume.
export function sharedBullets<B extends { resume_id?: string | null }>(bullets: B[]): B[] {
  return bullets.filter((b) => !b.resume_id)
}

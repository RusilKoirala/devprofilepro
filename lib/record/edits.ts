import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"
import { loadResume } from "@/lib/record/db"
import type { ItemType } from "@/lib/record/types"
import { reorderWithin } from "@/lib/resume/order"

// Resume edits without the re-fit. Server actions call one and re-fit; the chat applies several
// in a row and re-fits once. Each loads the resume itself, so a sequence never writes a stale layout.

export const RANGE = /\d\s*[-–]\s*\d|[<>~+]|\bk\b/i

const now = () => new Date().toISOString()

function must(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

async function resumeOrThrow(supabase: SupabaseClient, resumeId: string) {
  const resume = await loadResume(supabase, resumeId)
  if (!resume) throw new Error("Resume not found")
  return resume
}

// Links typed by hand: "github.com/x" or a bare GitHub username become full URLs.
export function normalizeLink(value: string | null | undefined, kind?: "github" | "linkedin"): string | null {
  const v = value?.trim()
  if (!v) return null
  if (/^https?:\/\//i.test(v)) return v
  if (kind === "github" && /^@?[A-Za-z0-9-]+$/.test(v)) return `https://github.com/${v.replace(/^@/, "")}`
  if (kind === "linkedin" && /^[A-Za-z0-9-]+$/.test(v)) return `https://www.linkedin.com/in/${v}`
  return `https://${v}`
}

const text = (max = 200) => z.string().trim().max(max).nullable().optional()

export const HeaderSchema = z.object({
  name: text(120),
  headline: text(120),
  target_role: text(120),
  email: text(),
  phone: text(60),
  location: text(120),
  website: text(),
  github: text(),
  linkedin: text(),
})
export type HeaderInput = z.input<typeof HeaderSchema>

export const DetailsSchema = z.object({
  role: text(), company: text(), name: text(), url: text(), school: text(), degree: text(), details: text(300),
  category: text(80), location: text(120), start: text(40), end: text(40),
  tech: z.array(z.string().trim().min(1).max(60)).max(20).nullable().optional(),
  skills: z.array(z.string().trim().min(1).max(60)).max(40).nullable().optional(),
})
export type DetailsInput = z.input<typeof DetailsSchema>

export const EDITABLE: Record<Exclude<ItemType, "contact">, (keyof z.infer<typeof DetailsSchema>)[]> = {
  job: ["role", "company", "location", "start", "end"],
  project: ["name", "url", "tech", "start", "end"],
  award: ["name", "url", "start", "end"],
  education: ["school", "degree", "details", "location", "start", "end"],
  skills: ["category", "skills"],
}

export async function editLine(supabase: SupabaseClient, resumeId: string, bulletId: string, input: string) {
  const clean = input.trim()
  if (!clean) throw new Error("A line can't be empty. Remove it instead.")
  const [{ data: bullet, error: bulletError }, resume] = await Promise.all([
    supabase.from("bullets").select("item_id").eq("id", bulletId).single(),
    resumeOrThrow(supabase, resumeId),
  ])
  must(bulletError)
  if (!resume.layout.items.some((li) => li.item_id === bullet!.item_id && li.bullet_ids.includes(bulletId))) throw new Error("That line isn't on this resume")
  // Edited text is a new user assertion; old quotes no longer prove it.
  const { data: fact, error: factError } = await supabase.from("facts").insert({ item_id: bullet!.item_id, text: clean, label: "user", approx: RANGE.test(clean) }).select("id").single()
  must(factError)
  const { error } = await supabase.from("bullets").update({ text: clean, fact_ids: [fact!.id], user_edited: true, updated_at: now() }).eq("id", bulletId)
  must(error)
}

// A line typed by the user: saved as a "You told us" fact plus a bullet that cites it.
export async function addLine(supabase: SupabaseClient, itemId: string, input: string) {
  const clean = z.string().trim().min(3, "Write a little more.").max(400).parse(input)
  const { data: fact, error: factError } = await supabase.from("facts").insert({ item_id: itemId, text: clean, label: "user", approx: RANGE.test(clean) }).select("id").single()
  must(factError)
  const { error } = await supabase.from("bullets").insert({ item_id: itemId, text: clean, fact_ids: [fact!.id], user_edited: true })
  must(error)
}

export const BulletSnapshot = z.object({ item_id: z.string().uuid(), text: z.string().min(1).max(600), fact_ids: z.array(z.string().uuid()).min(1), user_edited: z.boolean() })
export type DeletedBullet = z.infer<typeof BulletSnapshot>

// Facts stay in the Career Record; only the wording goes. Returns what's needed to undo.
export async function removeLine(supabase: SupabaseClient, bulletId: string): Promise<DeletedBullet> {
  const { data: bullet, error: bulletError } = await supabase.from("bullets").select("item_id,text,fact_ids,user_edited").eq("id", bulletId).single()
  must(bulletError)
  const { error } = await supabase.from("bullets").delete().eq("id", bulletId)
  must(error)
  return bullet as DeletedBullet
}

export async function setItemStateIn(supabase: SupabaseClient, resumeId: string | null, itemId: string, patch: { pinned?: boolean; status?: "shown" | "hidden" }) {
  const safePatch = z.object({ pinned: z.boolean().optional(), status: z.enum(["shown", "hidden"]).optional() }).strict().parse(patch)
  // On a tailored resume, hide/show only changes that resume's selection, never the base resume.
  const resume = resumeId ? await resumeOrThrow(supabase, resumeId) : null
  if (resume?.kind === "tailored" && resume.layout.include && safePatch.status) {
    const include = safePatch.status === "hidden" ? resume.layout.include.filter((id) => id !== itemId) : [...new Set([...resume.layout.include, itemId])]
    must((await supabase.from("resumes").update({ layout: { ...resume.layout, include }, updated_at: now() }).eq("id", resume.id)).error)
    delete safePatch.status
  }
  if (Object.keys(safePatch).length) must((await supabase.from("items").update({ ...safePatch, updated_at: now() }).eq("id", itemId)).error)
}

// Name, contact line, headline and target role. Typed by the user, so no source check.
export async function updateHeaderIn(supabase: SupabaseClient, resumeId: string, input: HeaderInput) {
  const h = HeaderSchema.parse(input)
  const [{ data: existing, error: contactError }, resume] = await Promise.all([
    supabase.from("items").select("id,data").eq("type", "contact").limit(1).maybeSingle(),
    resumeOrThrow(supabase, resumeId),
  ])
  must(contactError)
  // Only the fields given change, so a partial update (from the chat) keeps the rest.
  const contact: Record<string, string | null> = {}
  for (const key of ["name", "email", "phone", "location"] as const) if (key in h) contact[key] = h[key] || null
  if ("website" in h) contact.website = normalizeLink(h.website)
  if ("github" in h) contact.github = normalizeLink(h.github, "github")
  if ("linkedin" in h) contact.linkedin = normalizeLink(h.linkedin, "linkedin")
  if (existing) must((await supabase.from("items").update({ data: { ...existing.data, ...contact }, updated_at: now() }).eq("id", existing.id)).error)
  else must((await supabase.from("items").insert({ type: "contact", data: contact, rank: 100, status: "shown", reason: "Added by you" })).error)
  const layout = {
    ...resume.layout,
    ...("headline" in h ? { headline: h.headline ?? "" } : {}),
    ...("target_role" in h ? { target_role: h.target_role || undefined } : {}),
  }
  must((await supabase.from("resumes").update({ layout, updated_at: now() }).eq("id", resumeId)).error)
}

// Titles, companies, dates, links and skill lists.
export async function updateDetailsIn(supabase: SupabaseClient, itemId: string, input: DetailsInput) {
  const patch = DetailsSchema.parse(input)
  const { data: item, error: itemError } = await supabase.from("items").select("type,data").eq("id", itemId).single()
  must(itemError)
  if (item!.type === "contact") throw new Error("Edit contact details from the resume header.")
  const data = { ...item!.data }
  for (const key of EDITABLE[item!.type as Exclude<ItemType, "contact">]) {
    if (!(key in patch)) continue
    const value = patch[key]
    data[key] = key === "url" ? normalizeLink(value as string | null) : Array.isArray(value) ? (value.length ? value : null) : value || null
  }
  must((await supabase.from("items").update({ data, updated_at: now() }).eq("id", itemId)).error)
}

// Entry order inside one section. Display order only: what gets cut to fit still follows strength.
export async function setItemOrderIn(supabase: SupabaseClient, resumeId: string, sectionIds: string[]) {
  const ids = z.array(z.string().uuid()).min(1).max(100).parse(sectionIds)
  const resume = await resumeOrThrow(supabase, resumeId)
  const current = resume.layout.items.map((li) => li.item_id)
  if (new Set(ids).size !== ids.length || ids.some((id) => !current.includes(id))) throw new Error("That entry isn't on this resume any more. Refresh and try again.")
  const known = resume.layout.item_order?.length ? [...resume.layout.item_order, ...current.filter((id) => !resume.layout.item_order!.includes(id))] : current
  must((await supabase.from("resumes").update({ layout: { ...resume.layout, item_order: reorderWithin(known, ids) }, updated_at: now() }).eq("id", resumeId)).error)
}

// Sections not in `order` keep their place after these.
export async function setSectionOrderIn(supabase: SupabaseClient, resumeId: string, order: ItemType[]) {
  const types = z.array(z.enum(["job", "project", "education", "skills", "award"])).max(5).parse(order)
  if (new Set(types).size !== types.length) throw new Error("Each section can appear once.")
  const resume = await resumeOrThrow(supabase, resumeId)
  const section_order = [...types, ...resume.layout.section_order.filter((t) => !types.includes(t as (typeof types)[number]))]
  must((await supabase.from("resumes").update({ layout: { ...resume.layout, section_order }, updated_at: now() }).eq("id", resumeId)).error)
}

import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { IngestedSource } from "@/lib/ingest/types"
import type { Bullet, Fact, Item, Question, ResumeRow, SourceRow } from "@/lib/record/types"

export interface CareerRecord {
  sources: SourceRow[]
  items: Item[]
  facts: Fact[]
  bullets: Bullet[]
  questions: Question[]
}

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

export async function loadRecord(supabase: SupabaseClient): Promise<CareerRecord> {
  const [sources, items, facts, bullets, questions] = await Promise.all([
    supabase.from("sources").select("id,kind,label,raw_text,url,meta,status,fetched_at").order("fetched_at"),
    supabase.from("items").select("id,type,data,rank,status,reason,pinned").order("rank", { ascending: false }),
    supabase.from("facts").select("id,item_id,text,label,source_id,quote,approx").order("created_at"),
    supabase.from("bullets").select("id,item_id,text,fact_ids,user_edited").order("created_at"),
    supabase.from("questions").select("id,item_id,prompt,kind,options,answer,status").order("created_at"),
  ])
  return {
    sources: must(sources) as SourceRow[],
    items: must(items) as Item[],
    facts: must(facts) as Fact[],
    bullets: must(bullets) as Bullet[],
    questions: must(questions) as Question[],
  }
}

export async function loadResume(supabase: SupabaseClient, id: string): Promise<ResumeRow | null> {
  const { data } = await supabase.from("resumes").select("id,kind,job_id,title,layout,cut_log,updated_at").eq("id", id).maybeSingle()
  return data as ResumeRow | null
}

// Re-importing the same repo / PR / file updates its row instead of adding another.
export async function saveSources(supabase: SupabaseClient, sources: IngestedSource[]): Promise<SourceRow[]> {
  if (!sources.length) return []
  const rows = sources.map((s) => ({ ...s, meta: s.meta ?? {}, status: s.status ?? "ok", fetched_at: new Date().toISOString() }))
  const { data, error } = await supabase
    .from("sources")
    .upsert(rows, { onConflict: "user_id,kind,dedupe_key" })
    .select("id,kind,label,raw_text,url,meta,status,fetched_at")
  if (error) throw new Error(error.message)
  return data as SourceRow[]
}

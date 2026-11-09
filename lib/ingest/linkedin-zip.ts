  import { createHash } from "node:crypto"
import { unzipSync, strFromU8 } from "fflate"
	import type { IngestedSource } from "@/lib/ingest/types"

import { MAX_ZIP_BYTES } from "@/lib/ingest/limits"

export { MAX_ZIP_BYTES }

 const SECTIONS: [file: string,  heading: string][] = [
["Profile.csv", "Profile"],
  ["Positions.csv", "Experience"],
  ["Education.csv", "Education"],
  ["Projects.csv", "Projects"],
  ["Skills.csv", "Skills"],
  ["Certifications.csv", "Certifications"],
  ["Honors.csv", "Honors & Awards"],
   ["Volunteering.csv", "Volunteering"],
 ["Publications.csv", "Publications"],
  ["Courses.csv", "Courses"],
["Languages.csv", "Languages"],
   ]

const SKIP_COLUMNS = new Set(["Maiden Name", "Address", "Birth Date", "Zip Code", "Instant Messengers", "License Number"])

export function parseCsv(text: string): string[][] {
	  const rows: string[][] = []
  let row: string[] = []
	  let cell = ""    
  let quoted = false
  const endCell = () => {
      row.push(cell)
    cell = ""
  }
  for (let i = 0; i < text.length; i++) {
	    const c =  text[i]
	    if (quoted) {
      // two quotes inside quotes = one quote. csv is weird
      if (c === '"' && text[i + 1] === '"') {    
           cell += '"'
        i++
      } else if ( c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
      else if (c === ",") endCell() 
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++    
      endCell()  
      rows.push(row)
      row = []
    } else cell += c  
  }
  if (cell || row.length) {
    endCell()
  rows.push(row)    
  }
  return rows.filter( (r)=> r.some((v)=> v.trim()))



 }

export function renderSection(heading: string, csv: string): string | null {
     // linkedin csvs have that BOM thing at the start sometimes
     const [header, ...rows]= parseCsv(csv.replace(/^﻿/, "")) 
  if (!header || !rows.length) return null
  const cols = header.map((h) => h.trim())
  if (heading === "Skills") {
    const names = rows.map((r)=>r[0]?.trim()).filter(Boolean) 
    return names.length ? `## Skills\n${names.join(", ")}` : null
  }
  const blocks = rows
       .map((r) =>
      cols
        .map((col, i) => (SKIP_COLUMNS.has(col) || !r[i]?.trim() ? null : `${col}: ${r[i].trim().replace(/\s*\n\s*/g, "\n")}`))
        .filter(Boolean)
        .join("\n")    
     )



    .filter(Boolean)
  return blocks.length ? `## ${heading}\n${blocks.join("\n\n")}` : null
   }  

export async function ingestLinkedInZip(file: File): Promise<IngestedSource> {
  if (file.size > MAX_ZIP_BYTES) throw new Error(`${file.name} is over 10 MB. Request the smaller "fast file" export instead.`)
  const bytes = new Uint8Array(await file.arrayBuffer())

 const wanted = new Set(SECTIONS.map(([f]) => f.toLowerCase())) 
  let entries: Record<string, Uint8Array>
  try {
	    entries = unzipSync(bytes, { filter: (f) => wanted.has(f.name.split("/").pop()!.toLowerCase())})
 } catch {
    throw new Error(`${file.name} isn't a readable ZIP`)
  }
const byName =new Map(Object.entries(entries).map(([path, data]) => [path.split("/").pop( )!.toLowerCase(), strFromU8(data)]))

  const found: string[] = []
  const parts = SECTIONS.flatMap(([f, heading]) => {
    const csv =byName.get(f.toLowerCase())    
    const text = csv ? renderSection( heading,  csv) : null
    if (text) found.push(heading)
    return text ? [text] : []
  })    
  if (!parts.length) throw new Error(`${file.name} doesn't look like a LinkedIn data export (no Positions.csv, Education.csv or Skills.csv)`)

  const raw = `LinkedIn data export\n\n${parts.join("\n\n")}`
  return {
  kind: "linkedin_pdf",
    label: file.name,
    raw_text: raw,
    dedupe_key: createHash("sha256").update(raw).digest("hex"),
    status: "ok",
    meta: {format: "zip", sections: found},
    }
}

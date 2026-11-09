import { NextResponse } from "next/server"    
import {toLatex} from "@/lib/resume/latex"
import { exportFilename,loadResumeDoc } from "@/lib/resume/load"
import { createClient } from "@/lib/supabase/server"

export async function GET(_req: Request, { params }: { params: Promise<{ resumeId: string }> }) {
  const { resumeId } = await params
  const loaded = await loadResumeDoc(await createClient(), resumeId)  
  if (!loaded) return new NextResponse("Not found", { status: 404 })
  const filename =  exportFilename(loaded.doc.name, loaded.resume.title, loaded.resume.kind).replace(/\.pdf$/, ".tex")    
 return new NextResponse(toLatex(loaded.doc), {
    headers: { "Content-Type": "application/x-tex; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store" },
   })
  }

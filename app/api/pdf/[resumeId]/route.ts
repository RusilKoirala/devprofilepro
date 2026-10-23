import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { renderPdf } from "@/lib/resume/render"
import { exportFilename, loadResumeDoc } from "@/lib/resume/load"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

// GET: live preview (not saved). POST: export — save the exact PDF + snapshot, then download it.
export async function GET(_req: Request, { params }: { params: Promise<{ resumeId: string }> }) {
  const { resumeId } = await params
  const loaded = await loadResumeDoc(await createClient(), resumeId)
  if (!loaded) return new NextResponse("Not found", { status: 404 })
  const pdf = await renderPdf(loaded.doc)
  return new NextResponse(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": "inline", "Cache-Control": "no-store" },
  })
}

export async function POST(_req: Request, { params }: { params: Promise<{ resumeId: string }> }) {
  const { userId } = await auth()
  if (!userId) return new NextResponse("Unauthorized", { status: 401 })
  const { resumeId } = await params
  const supabase = await createClient()
  const loaded = await loadResumeDoc(supabase, resumeId)
  if (!loaded) return new NextResponse("Not found", { status: 404 })

  const pdf = await renderPdf(loaded.doc)
  const filename = exportFilename(loaded.doc.name, loaded.resume.title, loaded.resume.kind)
  const path = `${userId}/${crypto.randomUUID()}.pdf`
  const upload = await supabase.storage.from("exports").upload(path, pdf, { contentType: "application/pdf" })
  if (upload.error) return new NextResponse(`Couldn't save the export: ${upload.error.message}`, { status: 500 })

  const { data, error } = await supabase
    .from("exports")
    .insert({ resume_id: resumeId, snapshot: { doc: loaded.doc, layout: loaded.resume.layout }, pdf_path: path, filename })
    .select("id")
    .single()
  if (error) {
    await supabase.storage.from("exports").remove([path])
    return new NextResponse(error.message, { status: 500 })
  }

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Export-Id": data.id,
      "Cache-Control": "private, no-store",
    },
  })
}

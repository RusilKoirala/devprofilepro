import { NextResponse } from "next/server"
	import { createClient } from "@/lib/supabase/server"    

export const runtime = "nodejs"

export async function GET(_req: Request, { params }: { params: Promise<{ exportId: string }> }) {
  const { exportId } = await params
     const supabase = await createClient()
  const { data: row }=await supabase.from("exports").select("pdf_path,filename").eq("id", exportId).maybeSingle()
  if (!row) return new NextResponse("Not found", { status: 404 })
  // pls work
  const {data: file, error}= await supabase.storage.from("exports").download( row.pdf_path)
  if (error || !file) return new NextResponse("Not found", { status: 404 })
  return new NextResponse(file, {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${row.filename}"`, "Cache-Control": "private, no-store" },
 })
}

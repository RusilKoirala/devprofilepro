import { NextResponse } from "next/server"  

import { analyzeResume } from "@/lib/ats/analyze"
 import { extractPdf, MAX_ATS_PDF_BYTES } from "@/lib/ats/extract"
import {matchKeywords} from "@/lib/ats/keywords"
 import {allowPublic} from "@/lib/ratelimit"

  const PER_DAY = 20


//basically checking for ats like this code was availabe online just few tweaks needed
   export async function POST(request: Request)  {



  // first ip in x-forwarded-for is the real one (i think)
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown"
  if (!(await allowPublic("ats-check", ip,PER_DAY))) {
    return NextResponse.json({ error: `That's ${PER_DAY} checks today. Come back tomorrow, or sign up to check your resume as you build it.` }, { status: 429 })
  }

 const form =await request.formData().catch(() => null)  
  const file = form?.get("file")
	  if (!(file instanceof File) || !file.size) return NextResponse.json({ error: "Choose your resume PDF first."},  {status: 400})
  if (file.size > MAX_ATS_PDF_BYTES) return NextResponse.json({ error: "That PDF is over 5 MB. Export a smaller copy and try again." }, { status: 400 })  
  const bytes = new Uint8Array(await file.arrayBuffer())
  // lazy check, every pdf starts with %PDF
  if (String.fromCharCode(...bytes.slice(0, 4)) !== "%PDF") return NextResponse.json({error: "That isn't a PDF. Export your resume as PDF and try again." }, { status: 400 })

  try {    
    const extracted = await extractPdf( bytes)
    const report = analyzeResume(extracted)
    const jobPost = String(form?.get("jobPost") ?? "").slice(0, 20_000)
    const readable = report.checks.find((c) => c.id === "text")?.status === "pass"
       return NextResponse.json({ ...report,keywords: jobPost && readable ? matchKeywords(jobPost,extracted.text) : null })
  } catch (err) { 


    console.error("ats check failed", err)
    return NextResponse.json({ error: "We couldn't open that PDF. If it's password-protected, export an unlocked copy." }, { status: 422 })
  }
   }

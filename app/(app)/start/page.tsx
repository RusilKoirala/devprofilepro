import Link from "next/link"
import { ArrowRight, Briefcase, FilePen, Sparkles } from "lucide-react"
import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "Get started · DevProfile" }

// Three people arrive here: someone with no resume, someone with an outdated one, and someone
// applying to a job today. Each gets their own path instead of one form with every option.
export default async function StartPage() {
  const supabase = await createClient()
  const { data: base } = await supabase.from("resumes").select("id").eq("kind", "base").maybeSingle()

  const paths = [
    {
      href: "/start/new",
      icon: <Sparkles />,
      title: "I don't have a resume yet",
      body: "Connect GitHub, answer a few quick questions, and get a one-page resume built from your real work.",
      meta: "About 3 minutes",
    },
    {
      href: "/start/sources",
      icon: <FilePen />,
      title: "I have a resume to update",
      body: "Upload your current resume. We keep what's good, sharpen the rest, and add what's new on GitHub.",
      meta: "Upload a PDF",
    },
    {
      href: base ? "/resume" : "/start/new",
      icon: <Briefcase />,
      title: "I'm applying for a job",
      body: base ? "Paste the job post and get a version of your resume aimed at it. Every line stays true." : "Paste the job post and get a version aimed at it. We'll build your resume first, then tailor it.",
      meta: base ? "Under a minute" : "Starts with your resume",
    },
  ]

  return (
    <div className="mx-auto max-w-3xl pt-10">
      <h2 className="text-2xl font-medium tracking-tight">Where are you starting?</h2>
      <p className="mt-2 text-muted-foreground">Pick the one that sounds like you. You can do the others later.</p>
      <div className="mt-8 grid gap-3">
        {paths.map((p) => (
          <Link
            key={p.title}
            href={p.href}
            className="group flex items-start gap-4 rounded-3xl bg-card p-5 transition-colors hover:border-foreground/25 hover:bg-muted/30"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-card text-muted-foreground transition-colors group-hover:text-foreground [&_svg]:size-5">{p.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{p.title}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{p.body}</span>
              <span className="mt-3 block text-xs text-muted-foreground/80">{p.meta}</span>
            </span>
            <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
          </Link>
        ))}
      </div>
    </div>
  )
}

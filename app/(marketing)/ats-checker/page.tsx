import LightRays from "@/components/LightRays"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { AtsChecker } from "@/components/marketing/ats-checker"
import { isAppEnabled } from "@/lib/access"

export const metadata = {
  title: "Free ATS Resume Checker · DevProfile",
  description: "Upload your resume PDF and see if an applicant tracking system can read it: contact details, sections, layout, dates and job-post keywords. Free, no sign-up.",
}

const textGradient = "bg-gradient-to-b from-white to-white/65 bg-clip-text text-transparent"

const faqs = [
  {
    q: "What is an ATS?",
    a: "An applicant tracking system is the software most companies use to collect applications. It pulls your name, contact details, jobs, dates and skills out of your resume so recruiters can search and filter. If it can't read your file, those fields come out empty or jumbled.",
  },
  {
    q: "What does this checker look at?",
    a: "Whether the text can be read at all, your contact details, standard section headings, two-column layouts that get mixed together, icons that turn into garbage, date formats, length, and whether your bullets show results. Paste a job post to also see which of its keywords your resume mentions.",
  },
  {
    q: "Does passing mean I'll get an interview?",
    a: "No. Passing means software can read your resume. A person still decides, and they look for specific work and results. No tool can promise a pass in every ATS, because each one parses a little differently.",
  },
  {
    q: "Do you keep my resume?",
    a: "No. The file is read once to make your report and then discarded. Nothing is saved, and you don't need an account.",
  },
]

export default function AtsCheckerPage() {
  const cta = isAppEnabled() ? { href: "/sign-up", label: "Build my resume free" } : { href: "/#waitlist", label: "Join the waitlist" }
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem] [mask-image:linear-gradient(to_bottom,black_35%,transparent)]">
          <LightRays raysOrigin="top-center" raysColor="#ffffff" raysSpeed={0.5} lightSpread={0.7} rayLength={1.4} intensity={0.55} glow={0.4} haze={0.2} followMouse mouseInfluence={0.04} cursorShadow={false} clickPulse={false} noiseAmount={0.04} distortion={0.03} />
        </div>
        <div className="mx-auto max-w-7xl px-4 pt-36 pb-24 sm:px-6 md:pt-44">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="h-8 gap-2 rounded-full border-white/10 bg-white/[0.03] py-1 pr-3 pl-1 text-sm font-normal shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur">
              <Badge className="rounded-full px-2.5">Free</Badge>
              <span className="text-muted-foreground">No sign-up, nothing stored</span>
            </Badge>
            <h1 className={`mt-8 text-[2.6rem] leading-[1.1] font-semibold tracking-[-0.04em] sm:text-6xl ${textGradient}`}>
              Will your resume
              <br />
              pass the ATS?
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
              Upload your PDF. In seconds you&apos;ll see what applicant tracking software can read, what it can&apos;t, and exactly how to fix it.
            </p>
          </div>
          <div className="mt-14">
            <AtsChecker cta={cta} />
          </div>
        </div>
      </section>

      <section className="border-t">
        <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6">
          <h2 className="text-center text-4xl font-semibold tracking-[-0.03em] md:text-5xl">Questions</h2>
          <Accordion type="single" collapsible className="mt-12 w-full">
            {faqs.map((faq) => (
              <AccordionItem key={faq.q} value={faq.q}>
                <AccordionTrigger className="text-base">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-[15px] leading-relaxed text-muted-foreground">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </>
  )
}

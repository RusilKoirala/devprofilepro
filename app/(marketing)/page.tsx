import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import SpotlightCard from "@/components/SpotlightCard"
import { Features } from "@/components/marketing/features"
import { Hero } from "@/components/marketing/hero"
import { HowItWorks } from "@/components/marketing/how-it-works"
import { StudentSample } from "@/components/marketing/student-sample"
import { LineLoop } from "@/components/marketing/line-loop"
import { CompanyStrip } from "@/components/marketing/company-strip"
import { WaitlistForm } from "@/components/marketing/waitlist-form"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { isAppEnabled } from "@/lib/access"

const whenFaq = (open: boolean) => ({
  q: "When can I use it?",
  a: open
    ? "Now. Sign up free, add your GitHub or an old resume, and download your first PDF in a few minutes."
    : "We're letting people in from the waitlist in batches. Join and you'll get one email when it's your turn.",
})

const faqs = [
  {
    q: "Will it make things up?",
    a: "No. It only writes from passages in your own sources and leaves out anything it can't back up. If your GitHub doesn't say how many users a project has, the resume won't either.",
  },
  {
    q: "Do you need my LinkedIn password?",
    a: "No. LinkedIn lets you save your own profile as a PDF (More, then Save to PDF). You upload that file. We never sign in as you.",
  },
  {
    q: "Do I need to know LaTeX?",
    a: "No. You get a finished PDF. The .tex file is there if you want to tweak something by hand.",
  },
  {
    q: "What happens to my data?",
    a: "Your public GitHub data and the files you upload are only used to write your resume. DevProfile never posts anything for you. You can remove any source, or delete all of it, from the Career Record page. See the privacy page for details.",
  },
]

export default function LandingPage() {
  const open = isAppEnabled()
  return (
    <>
      <Hero open={open} />
      <CompanyStrip />
      <LineLoop />
      <Features />

      <HowItWorks />
      <StudentSample />

      <section id="faq">
        <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6 md:py-32">
          <h2 className="text-center text-4xl font-semibold tracking-[-0.03em] md:text-5xl">Questions</h2>
          <Accordion type="single" collapsible className="mt-12 w-full">
            {[whenFaq(open), ...faqs].map((faq) => (
              <AccordionItem key={faq.q} value={faq.q}>
                <AccordionTrigger className="text-base">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-[15px] leading-relaxed text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section id="waitlist" className="px-4 pb-24 sm:px-6 md:pb-32">
        <SpotlightCard
          spotlightColor="rgba(255, 255, 255, 0.12)"
          className="mx-auto max-w-5xl rounded-[2rem] bg-card px-6 py-16 text-center md:py-24"
        >
          <div className="relative">
            {open ? (
              <>
                <h2 className="mx-auto max-w-2xl text-4xl font-semibold tracking-[-0.03em] text-balance md:text-5xl">
                  Your resume, from your real work
                </h2>
                <p className="mx-auto mt-4 max-w-lg text-lg text-pretty text-muted-foreground">
                  Free to build, edit and download. Your first PDF takes a few minutes.
                </p>
                <Button asChild size="lg" className="group mt-10 h-11 rounded-full px-6 text-[15px]">
                  <Link href="/sign-up">Build my resume free <ArrowRight className="transition-transform group-hover:translate-x-0.5" /></Link>
                </Button>
              </>
            ) : (
              <>
                <h2 className="mx-auto max-w-2xl text-4xl font-semibold tracking-[-0.03em] text-balance md:text-5xl">
                  Get your resume before everyone else
                </h2>
                <p className="mx-auto mt-4 max-w-lg text-lg text-pretty text-muted-foreground">
                  DevProfile opens in batches. Leave your email and we&apos;ll send your invite.
                </p>
                <WaitlistForm id="waitlist-email" className="mx-auto mt-10" />
              </>
            )}
          </div>
        </SpotlightCard>
      </section>
    </>
  )
}

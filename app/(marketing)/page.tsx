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
import { LineLoop } from "@/components/marketing/line-loop"
import { WaitlistForm } from "@/components/marketing/waitlist-form"

const faqs = [
  {
    q: "When can I use it?",
    a: "We're letting people in from the waitlist in batches. Join and you'll get one email when it's your turn.",
  },
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
    a: "Your public GitHub and X data and the files you upload are only used to write your resume. DevProfile never posts anything for you.",
  },
]

export default function LandingPage() {
  return (
    <>
      <Hero />
      <LineLoop />
      <Features />

      <HowItWorks />

      <section id="faq" className="border-t">
        <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6 md:py-32">
          <h2 className="text-center text-4xl font-semibold tracking-[-0.03em] md:text-5xl">Questions</h2>
          <Accordion type="single" collapsible className="mt-12 w-full">
            {faqs.map((faq) => (
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
          className="mx-auto max-w-5xl rounded-3xl border bg-card/60 px-6 py-16 text-center md:py-24"
        >
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-4xl font-semibold tracking-[-0.03em] text-balance md:text-5xl">
              Get your resume before everyone else
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg text-pretty text-muted-foreground">
              DevProfile opens in batches. Leave your email and we&apos;ll send your invite.
            </p>
            <WaitlistForm id="waitlist-email" className="mx-auto mt-10" />
          </div>
        </SpotlightCard>
      </section>
    </>
  )
}

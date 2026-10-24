import Link from "next/link"
import { ArrowRight, CalendarCheck, CircleSlash, FileDown, Globe } from "lucide-react"
import LightRays from "@/components/LightRays"
import SpotlightCard from "@/components/SpotlightCard"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PricingPlans } from "@/components/marketing/pricing-plans"
import { isAppEnabled } from "@/lib/access"

export const metadata = {
  title: "Pricing · DevProfile",
  description: "Free to build and download your resume. Pro is $12 a month, or $29 for 3 months with no auto-renew.",
}

const textGradient = "bg-gradient-to-b from-white to-white/65 bg-clip-text text-transparent"

// The rules from docs/PRICING.md section 8, said plainly where people decide to pay.
const promises = [
  { icon: FileDown, title: "Your PDF is never paywalled", body: "Download free, no watermark, as often as you like." },
  { icon: CalendarCheck, title: "The pass never renews", body: "3 months, one payment, then it simply ends." },
  { icon: CircleSlash, title: "Cancel in one click", body: "Right from your dashboard. You keep Pro until the month you paid for ends." },
  { icon: Globe, title: "One price everywhere", body: "$12 a month or $29 for 3 months, in any country. Taxes included." },
]

const faqs = [
  {
    q: "Is Free actually free?",
    a: "Yes. You can build your resume, edit it, run the checks and download the PDF and LaTeX as many times as you want, with no card and no watermark. Free also includes 3 tailored resumes and 20 AI fixes every month.",
  },
  {
    q: "What counts as a tailored resume?",
    a: "Each time you paste a job post and save a version of your resume aimed at it. Editing that version afterwards, downloading it, or checking it doesn't count again.",
  },
  {
    q: "What's an AI fix?",
    a: "Asking the AI to change your resume for you: rewrite an entry, make a line shorter, or a chat edit. Typing your own changes, reordering, hiding entries and answering our quick questions are always free and unlimited.",
  },
  {
    q: "What happens if I run out on Free?",
    a: "New tailored resumes, AI fixes and syncs pause until the 1st of the month, when they refill. Nothing you've made gets locked: you keep editing by hand, running checks and downloading every resume.",
  },
  {
    q: "How is the 3-month pass different from monthly?",
    a: "The pass is one payment of $29 for 90 days of Pro, and then it ends. It never renews, so you won't be charged after you've landed the job. Monthly is $12 and renews each month until you cancel, which takes one click from your dashboard.",
  },
  {
    q: "What does unlimited mean on Pro?",
    a: "As many tailored resumes and AI fixes as a real job search needs. On a very heavy day, far past normal use, Pro switches to a faster model until midnight UTC instead of cutting you off. Only automated or abusive use, many times more than that, is paused for the day.",
  },
  {
    q: "Can I get a refund?",
    a: "No. Payments aren't refunded, so try Free first: it has everything except the volume. You can cancel monthly anytime in one click and keep Pro until the end of the month you paid for. The 3-month pass simply ends after 90 days.",
  },
  {
    q: "Can I take my data with me?",
    a: "Always. Download your PDF and LaTeX source, or export your whole Career Record as data, on any plan. Cancelling Pro never deletes anything.",
  },
]

export default function PricingPage() {
  const cta = isAppEnabled()
    ? { href: "/sign-up", label: "Start free", proLabel: "Get Pro" }
    : { href: "/#waitlist", label: "Join the waitlist", proLabel: "Join the waitlist" }

  return (
    <>
      <section className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[40rem] [mask-image:linear-gradient(to_bottom,black_35%,transparent)]">
          <LightRays
            raysOrigin="top-center"
            raysColor="#ffffff"
            raysSpeed={0.5}
            lightSpread={0.7}
            rayLength={1.4}
            intensity={0.6}
            glow={0.4}
            haze={0.2}
            followMouse
            mouseInfluence={0.04}
            cursorShadow={false}
            clickPulse={false}
            noiseAmount={0.04}
            distortion={0.03}
          />
        </div>

        <div className="mx-auto max-w-7xl px-4 pt-36 pb-20 sm:px-6 md:pt-44 md:pb-28">
          <div className="mx-auto max-w-2xl text-center">
            <Badge
              variant="outline"
              className="h-8 gap-2 rounded-full border-white/10 bg-white/[0.03] py-1 pr-3 pl-1 text-sm font-normal shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur"
            >
              <Badge className="rounded-full px-2.5">Free</Badge>
              <span className="text-muted-foreground">Build and download your resume at no cost</span>
            </Badge>
            <h1 className={`mt-8 text-[2.6rem] leading-[1.1] font-semibold tracking-[-0.04em] sm:text-6xl ${textGradient}`}>
              Simple pricing.
              <br />
              No traps.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
              Your resume is free to make and free to download. Pay only when you&apos;re applying to lots of jobs and want a
              tailored version for each one.
            </p>
          </div>

          <div className="mt-14">
            <PricingPlans cta={cta} />
          </div>

          <p className="mt-8 flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <Globe className="size-4 shrink-0" />
            Prices in USD. Your bank may convert to your currency at checkout.
          </p>
        </div>
      </section>

      <section className="border-t">
        <div className="mx-auto grid max-w-6xl px-4 py-16 sm:grid-cols-2 sm:px-6 md:py-20 lg:grid-cols-4">
          {promises.map(({ icon: Icon, title, body }) => (
            <div key={title} className="p-5">
              <span className="grid size-9 place-items-center rounded-xl bg-white/[0.05] ring-1 ring-white/10">
                <Icon className="size-4" />
              </span>
              <h2 className="mt-4 font-medium tracking-tight">{title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-pretty text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="faq" className="border-t">
        <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6 md:py-32">
          <h2 className="text-center text-4xl font-semibold tracking-[-0.03em] md:text-5xl">Pricing questions</h2>
          <Accordion type="single" collapsible className="mt-12 w-full">
            {faqs.map((faq) => (
              <AccordionItem key={faq.q} value={faq.q}>
                <AccordionTrigger className="text-base">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-[15px] leading-relaxed text-muted-foreground">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <p className="mt-10 text-center text-sm text-muted-foreground">
            Something else?{" "}
            <Link href="mailto:dev@rusil.me" className="text-foreground underline-offset-4 hover:underline">
              Email us
            </Link>
          </p>
        </div>
      </section>

      <section className="px-4 pb-24 sm:px-6 md:pb-32">
        <SpotlightCard
          spotlightColor="rgba(255, 255, 255, 0.12)"
          className="mx-auto max-w-5xl rounded-3xl border bg-card/60 px-6 py-16 text-center md:py-24"
        >
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-4xl font-semibold tracking-[-0.03em] text-balance md:text-5xl">
              Start with the free resume
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg text-pretty text-muted-foreground">
              Most people never need more. Upgrade only when you&apos;re applying everywhere.
            </p>
            <Button
              asChild
              size="lg"
              className="group mt-10 h-11 rounded-full px-6 text-[15px] shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_8px_30px_-6px_rgba(255,255,255,0.35)]"
            >
              <Link href={cta.href}>
                {cta.label}
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </div>
        </SpotlightCard>
      </section>
    </>
  )
}

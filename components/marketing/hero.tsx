"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "motion/react"
import { ArrowRight, FileText } from "lucide-react"
import LightRays from "@/components/LightRays"
import ShinyText from "@/components/ShinyText"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ContainerScroll } from "@/components/ui/container-scroll-animation"
import { cn } from "@/lib/utils"
import { AppMockup } from "./app-mockup"
import { GitHubIcon, LinkedInIcon, XIcon } from "./brand-icons"

// Soft top-to-bottom fade on headline text, the way most premium dark heroes do it.
const textGradient = "bg-gradient-to-b from-white to-white/65 bg-clip-text text-transparent"

function Chip({
  icon: Icon,
  label,
  iconClassName,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  iconClassName: string
}) {
  return (
    <span className="inline-flex translate-y-[-0.05em] items-center gap-[0.2em] rounded-full bg-white/[0.05] py-[0.06em] pr-[0.32em] pl-[0.07em] align-middle shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-white/[0.08]">
      <span
        className={cn(
          "grid size-[0.74em] shrink-0 place-items-center rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]",
          iconClassName
        )}
      >
        <Icon className="size-[0.4em]" />
      </span>
      <span className={textGradient}>{label}</span>
    </span>
  )
}

// Headline pieces, revealed word by word with the same blur-in as React Bits' BlurText.
const LINE_BREAK = "\n"

const headline: React.ReactNode[] = [
  "Turn",
  "your",
  <Chip key="gh" icon={GitHubIcon} label="GitHub" iconClassName="bg-white text-black" />,
  "and",
  <Chip key="li" icon={LinkedInIcon} label="LinkedIn" iconClassName="bg-[#0A66C2] text-white" />,
  LINE_BREAK,
  "into",
  "a",
  "one-page",
  "resume.",
]

const sources = [
  { icon: GitHubIcon, label: "GitHub" },
  { icon: LinkedInIcon, label: "LinkedIn" },
  { icon: XIcon, label: "X" },
  { icon: FileText, label: "Any PDF" },
]

function Headline() {
  const reduce = useReducedMotion()
  return (
    <h1 className="mx-auto text-[2.6rem] leading-[1.1] font-semibold tracking-[-0.04em] sm:text-6xl md:text-[3.4rem] lg:text-[4.1rem] xl:text-[4.4rem]">
      {headline.map((piece, i) =>
        piece === LINE_BREAK ? (
          <br key={i} className="hidden md:block" />
        ) : (
        <motion.span
          key={i}
          className={cn("inline-block py-[0.04em]", typeof piece === "string" && textGradient)}
          initial={reduce ? false : { filter: "blur(12px)", opacity: 0, y: 18 }}
          animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          {piece}
          {i < headline.length - 1 && " "}
        </motion.span>
      ))}
    </h1>
  )
}

function FadeIn({ delay, children, className }: { delay: number; children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

export function Hero() {
  return (
    <section id="product" className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[56rem] [mask-image:linear-gradient(to_bottom,black_40%,transparent)]">
        <LightRays
          raysOrigin="top-center"
          raysColor="#ffffff"
          raysSpeed={0.7}
          lightSpread={0.75}
          rayLength={1.8}
          intensity={0.85}
          glow={0.5}
          haze={0.2}
          followMouse
          mouseInfluence={0.05}
          cursorShadow={false}
          clickPulse={false}
          noiseAmount={0.04}
          distortion={0.03}
        />
      </div>

      {/* Soft glow the product window sits in */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-[40rem] -z-10 h-[44rem] bg-[radial-gradient(50%_45%_at_50%_45%,rgba(255,255,255,0.07),transparent)] md:top-[44rem]"
      />

      <ContainerScroll
        titleComponent={
          <div className="px-2">
            <FadeIn delay={0}>
              <Link href="#waitlist" className="group inline-block rounded-full focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
                <Badge
                  variant="outline"
                  className="h-8 gap-2 rounded-full border-white/10 bg-white/[0.03] py-1 pr-3 pl-1 text-sm font-normal shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur transition-colors group-hover:bg-white/[0.06]"
                >
                  <Badge className="rounded-full px-2.5">Soon</Badge>
                  <ShinyText text="Early access is opening in batches" color="#a1a1a1" shineColor="#ffffff" speed={3} />
                  <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Badge>
              </Link>
            </FadeIn>

            <div className="mt-8">
              <Headline />
            </div>

            <FadeIn delay={0.9}>
              <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
                Add your X and an old resume too. DevProfile keeps the facts, writes a clean one-page
                LaTeX resume, and updates it every time you ship.
              </p>
            </FadeIn>

            <FadeIn delay={1.05} className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="group h-11 rounded-full px-6 text-[15px] shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_8px_30px_-6px_rgba(255,255,255,0.35)]"
              >
                <Link href="#waitlist">
                  Join the waitlist
                  <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-11 rounded-full border-white/10 bg-white/[0.03] px-6 text-[15px] backdrop-blur hover:bg-white/[0.07]"
              >
                <Link href="#how-it-works">See how it works</Link>
              </Button>
            </FadeIn>

            <FadeIn delay={1.2} className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <span className="hidden sm:inline">Reads from</span>
              {sources.map(({ icon: Icon, label }) => (
                <span key={label} className="flex items-center gap-2 text-foreground/70">
                  <Icon className="size-4" />
                  {label}
                </span>
              ))}
            </FadeIn>
          </div>
        }
      >
        <AppMockup />
      </ContainerScroll>
    </section>
  )
}

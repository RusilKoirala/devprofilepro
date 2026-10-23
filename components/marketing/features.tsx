import { FileText, GitCommitHorizontal, Link2, Ruler, Target } from "lucide-react"
import SpotlightCard from "@/components/SpotlightCard"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { GitHubIcon, LinkedInIcon, XIcon } from "./brand-icons"

function Feature({
  title,
  body,
  children,
  className,
}: {
  title: string
  body: string
  children?: React.ReactNode
  className?: string
}) {
  return (
    <SpotlightCard
      spotlightColor="rgba(255, 255, 255, 0.10)"
      className={cn("flex flex-col rounded-2xl border bg-card/60 p-6 md:p-7", className)}
    >
      <div className="relative flex min-h-36 flex-1 items-center">{children}</div>
      <h3 className="relative mt-6 text-lg font-medium tracking-tight">{title}</h3>
      <p className="relative mt-1.5 leading-relaxed text-pretty text-muted-foreground">{body}</p>
    </SpotlightCard>
  )
}

const sourceRows = [
  { icon: GitHubIcon, label: "github.com/mayachen", meta: "42 repos, 8 READMEs" },
  { icon: LinkedInIcon, label: "LinkedIn export", meta: "4 roles, 2 schools" },
  { icon: FileText, label: "resume-2023.pdf", meta: "2 pages" },
  { icon: XIcon, label: "x.com/mayabuilds", meta: "Bio, 20 posts" },
]

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 md:py-32">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-4xl font-semibold tracking-[-0.03em] text-balance md:text-5xl">
          Everything you&apos;ve built, on one page
        </h2>
        <p className="mt-4 text-lg text-pretty text-muted-foreground">
          You&apos;ve already described your work in a dozen places. DevProfile reads all of them and keeps
          what matters.
        </p>
      </div>

      <div className="mt-16 grid gap-4 md:grid-cols-3">
        <Feature
          className="md:col-span-2"
          title="Reads everything you've already written"
          body="Repos and READMEs, your LinkedIn export, an old PDF, your X bio. Use one source or all of them."
        >
          <div className="grid w-full gap-2 sm:grid-cols-2">
            {sourceRows.map(({ icon: Icon, label, meta }) => (
              <div key={label} className="flex items-center gap-3 rounded-xl border bg-background/60 px-3 py-2.5">
                <span className="grid size-8 place-items-center rounded-lg bg-accent">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground">{meta}</p>
                </div>
              </div>
            ))}
          </div>
        </Feature>

        <Feature
          title="Nothing made up"
          body="Every line points back to a repo, a role or a sentence you wrote. If it isn't in your sources, it isn't on the page."
        >
          <div className="w-full space-y-2 text-sm">
            <p className="rounded-xl border bg-background/60 px-3 py-2.5">
              Cut p95 load time 48% with cursor pagination
            </p>
            <p className="flex items-center gap-1.5 pl-3 text-xs text-muted-foreground">
              <Link2 className="size-3.5" /> from wealthsimple-card-feed/README.md
            </p>
          </div>
        </Feature>

        <Feature
          title="Always one page"
          body="When something new goes on, the weakest line comes off. No 6pt fonts, no second page."
        >
          <div className="w-full space-y-3 rounded-xl border bg-background/60 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Ruler className="size-4" /> Page fill
              </span>
              <span>96%</span>
            </div>
            <Progress value={96} className="h-1.5" />
          </div>
        </Feature>

        <Feature
          className="md:col-span-2"
          title="Updates when you ship"
          body="DevProfile watches your GitHub. A new project or a big milestone becomes a new line, and you get a fresh PDF."
        >
          <div className="w-full space-y-2 font-mono text-[13px]">
            <div className="flex items-center gap-3 rounded-xl border bg-background/60 px-3 py-2.5 text-muted-foreground">
              <GitCommitHorizontal className="size-4 shrink-0" />
              <span className="truncate">feat: offline sync for the mobile app</span>
              <Badge variant="outline" className="ml-auto font-sans font-normal">
                tidepool/mobile
              </Badge>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2.5 text-emerald-300">
              + Shipped offline sync for 40k weekly users; cut cold start from 2.1s to 0.6s
            </div>
          </div>
        </Feature>

        <Feature
          title="Real LaTeX you own"
          body="Download the PDF, or take the .tex and open it in Overleaf to edit by hand."
        >
          <pre className="w-full overflow-hidden rounded-xl border bg-background/60 p-4 font-mono text-[12px] leading-relaxed text-muted-foreground">
            <span className="text-foreground">\section</span>{"{Experience}\n"}
            <span className="text-foreground">\textbf</span>{"{Tidepool Health}\n"}
            <span className="text-foreground">\hfill</span>{" Mar 2023 -- Present"}
          </pre>
        </Feature>

        <Feature
          className="md:col-span-2"
          title="Aimed at the job you want"
          body="Tell it the role and it leads with the work that fits. Same facts, different emphasis."
        >
          <div className="flex flex-wrap gap-2">
            {["Senior Mobile Engineer", "Staff Engineer", "Founding Engineer", "Developer Advocate"].map(
              (role, i) => (
                <Badge
                  key={role}
                  variant={i === 0 ? "default" : "outline"}
                  className="h-8 gap-1.5 rounded-full px-3 text-sm font-normal"
                >
                  {i === 0 && <Target />}
                  {role}
                </Badge>
              )
            )}
          </div>
        </Feature>
      </div>
    </section>
  )
}

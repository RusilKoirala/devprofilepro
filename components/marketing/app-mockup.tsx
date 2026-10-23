import { Download, ExternalLink, FileText, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { GitHubIcon, LinkedInIcon, XIcon } from "./brand-icons"
import { LogoMark } from "./logo"

const sources = [
  { icon: GitHubIcon, title: "github.com/mayachen", meta: "42 repos read", status: "Live" },
  { icon: LinkedInIcon, title: "LinkedIn", meta: "Profile.pdf", status: "Synced" },
  { icon: FileText, title: "resume-2023.pdf", meta: "2 pages", status: "Read" },
  { icon: XIcon, title: "x.com/mayabuilds", meta: "Bio and posts", status: "Read" },
]

const changes = [
  {
    kind: "Added",
    tone: "text-emerald-400",
    text: "Shipped offline sync for 40k weekly users; cut cold start from 2.1s to 0.6s",
    from: "push to tidepool/mobile",
    when: "2m",
  },
  {
    kind: "Updated",
    tone: "text-sky-400",
    text: "tidal: 1.9k → 2.3k stars",
    from: "GitHub stars",
    when: "3d",
  },
  {
    kind: "Trimmed",
    tone: "text-amber-400",
    text: "Shortened the 2019 internship to keep the page at one",
    from: "page fit",
    when: "3d",
  },
]

// A static picture of the product. It's decorative, so it's hidden from
// assistive tech and made inert so none of its controls take focus.
export function AppMockup() {
  return (
    <div aria-hidden="true" inert className="flex h-full flex-col text-left select-none">
      {/* Top bar */}
      <div className="flex h-12 shrink-0 items-center gap-3 border-b px-4">
        <LogoMark className="size-5" />
        <span className="text-sm font-medium">Maya Chen</span>
        <Badge variant="outline" className="hidden font-normal text-muted-foreground sm:inline-flex">
          v14
        </Badge>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="secondary" className="hidden gap-1.5 font-normal md:inline-flex">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            Synced 2 min ago
          </Badge>
          <Button size="sm" variant="ghost" className="hidden h-8 md:inline-flex">
            <ExternalLink /> Overleaf
          </Button>
          <Button size="sm" className="h-8 rounded-full">
            <Download /> Export PDF
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 md:grid-cols-[250px_1fr] lg:grid-cols-[250px_1fr_290px]">
        {/* Sources */}
        <aside className="hidden flex-col gap-4 border-r p-3 md:flex">
          <p className="px-1 text-xs font-medium text-muted-foreground">Sources</p>
          <ItemGroup className="gap-1">
            {sources.map(({ icon: Icon, title, meta, status }) => (
              <Item key={title} size="sm" className="rounded-lg px-2 py-2 hover:bg-accent/50">
                <ItemMedia variant="icon" className="bg-accent">
                  <Icon className="size-3.5" />
                </ItemMedia>
                <ItemContent className="min-w-0">
                  <ItemTitle className="truncate text-[13px]">{title}</ItemTitle>
                  <ItemDescription className="text-xs">{meta}</ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal text-muted-foreground">
                    {status}
                  </Badge>
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
          <Separator />
          <div className="space-y-2 px-1">
            <Label className="text-xs text-muted-foreground">Target role</Label>
            <Input readOnly value="Senior Mobile Engineer" className="h-8 text-[13px]" />
          </div>
          <div className="flex items-center justify-between px-1">
            <Label className="text-[13px]">Update when I ship</Label>
            <Switch checked />
          </div>
        </aside>

        {/* Resume preview */}
        <div className="flex min-h-0 justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_0%,oklch(0.22_0_0),transparent_70%)] px-4 pt-6">
          <ResumeSheet />
        </div>

        {/* Changes */}
        <aside className="hidden flex-col gap-3 border-l p-3 lg:flex">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-medium text-muted-foreground">What changed</p>
            <Sparkles className="size-3.5 text-muted-foreground" />
          </div>
          <ItemGroup className="gap-2">
            {changes.map((change) => (
              <Item key={change.text} variant="outline" size="sm" className="flex-col items-start gap-1.5 rounded-lg px-3 py-2.5">
                <div className="flex w-full items-center justify-between text-xs">
                  <span className={change.tone}>{change.kind}</span>
                  <span className="text-muted-foreground">{change.when}</span>
                </div>
                <ItemTitle className="text-[13px] leading-snug font-normal">{change.text}</ItemTitle>
                <ItemDescription className="text-xs">from {change.from}</ItemDescription>
              </Item>
            ))}
          </ItemGroup>
          <div className="mt-auto space-y-2 rounded-lg border p-3">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Page fill</span>
              <span>96%</span>
            </div>
            <Progress value={96} className="h-1.5" />
            <p className="text-xs text-muted-foreground">Fits on one page</p>
          </div>
        </aside>
      </div>
    </div>
  )
}

function ResumeSheet() {
  return (
    <div className="w-full max-w-[520px] rounded-t-md bg-white px-[6%] pt-[5%] pb-10 font-serif text-[8.5px] leading-[1.35] text-neutral-900 shadow-2xl md:text-[9.5px]">
      <div className="text-center">
        <p className="text-[2.6em] leading-none tracking-wide [font-variant:small-caps]">Maya Chen</p>
        <p className="mt-1.5 text-neutral-700">
          maya@chen.dev | github.com/mayachen | linkedin.com/in/mayachen | Toronto, ON
        </p>
      </div>
      <Section title="Experience">
        <Row left="Tidepool Health" right="Mar 2023 – Present" />
        <Row left="Senior Mobile Engineer" right="Toronto, ON" italic />
        <ul className="mt-0.5 list-disc space-y-px pl-4">
          <li className="-mx-1 rounded-sm bg-emerald-100 px-1">
            Shipped offline sync for 40k weekly users; cut cold start from 2.1s to 0.6s
          </li>
          <li>Led migration of the React Native app to the new architecture across 3 teams</li>
          <li>Built the experimentation SDK used by every product squad; 120+ live tests</li>
        </ul>
        <div className="mt-1.5" />
        <Row left="Wealthsimple" right="Jun 2020 – Feb 2023" />
        <Row left="Software Engineer" right="Toronto, ON" italic />
        <ul className="mt-0.5 list-disc space-y-px pl-4">
          <li>Owned the card-transaction feed; cut p95 load time 48% with cursor pagination</li>
          <li>Mentored 4 interns; two returned full-time</li>
        </ul>
      </Section>
      <Section title="Projects">
        <Row left="tidal | Rust, WebAssembly" right="2.3k stars" />
        <ul className="mt-0.5 list-disc pl-4">
          <li>CRDT-based local-first sync engine; adopted by 30+ open-source apps</li>
        </ul>
        <div className="mt-1" />
        <Row left="pocketlint | TypeScript" right="840 stars" />
        <ul className="mt-0.5 list-disc pl-4">
          <li>Lint rules for React Native performance pitfalls; 60k weekly downloads</li>
        </ul>
      </Section>
      <Section title="Education">
        <Row left="University of Waterloo" right="2016 – 2020" />
        <Row left="B.Math, Computer Science" right="Waterloo, ON" italic />
      </Section>
      <Section title="Skills">
        <p>
          <b>Languages:</b> TypeScript, Rust, Kotlin, Swift, SQL
        </p>
        <p>
          <b>Tools:</b> React Native, Next.js, Postgres, SQLite, GitHub Actions
        </p>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <p className="border-b border-neutral-800 text-[1.2em] [font-variant:small-caps]">{title}</p>
      <div className="mt-1">{children}</div>
    </div>
  )
}

function Row({ left, right, italic }: { left: string; right: string; italic?: boolean }) {
  return (
    <div className={italic ? "flex justify-between italic" : "flex justify-between font-semibold"}>
      <span>{left}</span>
      <span className={italic ? "" : "font-normal"}>{right}</span>
    </div>
  )
}

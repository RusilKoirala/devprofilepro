import { ArrowRight, EyeOff, FileText } from "lucide-react"
import { GitHubIcon } from "./brand-icons"
import sample from "./student-sample.json"

// A modest, real example: a student's three small repos run through the actual pipeline by
// scripts/build-sample.mts. Shown as it came out, weak lines included, next to the polished demo.

// Lines that only restate activity (commit counts, "deployed at") rather than what was built.
const THIN = /\b(commits?|repository|deployed (it )?(live )?at|solely managed|sole contributor)\b/i

const date = new Date(sample.generated).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })

export function StudentSample() {
  const thin = [...new Set([...sample.draft.flatMap((d) => d.lines), ...sample.after.lines].filter((l) => THIN.test(l)))]
  return (
    <section id="sample" className="border-t">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 md:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-4xl font-semibold tracking-[-0.03em] text-balance md:text-5xl">A real first draft, not a demo</h2>
          <p className="mt-4 text-lg text-pretty text-muted-foreground">
            The resume above is a made-up senior engineer. This is a student with three small repos and no jobs, run through the actual pipeline on {date}, shown exactly as it came out.
          </p>
        </div>

        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          <Step n={1} title="What it had to work with">
            <ul className="space-y-2.5">
              {sample.sources.filter((s) => s.label !== sample.sources[0].label).map((s) => (
                <li key={s.label} className="flex items-start gap-2.5">
                  <GitHubIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span>
                    {s.label}
                    {s.summary && <span className="block text-muted-foreground">{s.summary}</span>}
                  </span>
                </li>
              ))}
            </ul>
            {sample.hidden.map((h) => (
              <p key={h.title} className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                <EyeOff className="mt-0.5 size-3.5 shrink-0" /> Left off: {h.title}. {h.reason}.
              </p>
            ))}
            <p className="mt-4 text-xs text-muted-foreground">{sample.factsKept} facts found, each matched word for word in the repos.</p>
          </Step>

          <Step n={2} title={`First draft, ${sample.seconds} seconds`}>
            <div className="space-y-4">
              {sample.draft.map((d) => (
                <div key={d.title}>
                  <p className="font-medium">{d.title}</p>
                  <Lines lines={d.lines} />
                </div>
              ))}
            </div>
          </Step>

          <Step n={3} title="One question later">
            <p className="text-muted-foreground">{sample.question.prompt}</p>
            <p className="mt-2 rounded-lg border bg-background/60 px-3 py-2">“{sample.question.answer}”</p>
            <p className="mt-1 text-xs text-muted-foreground">Example answer, typed by hand.</p>
            <p className="mt-4 flex items-center gap-1.5 font-medium">{sample.after.title} <ArrowRight className="size-3.5 text-muted-foreground" /> rewritten</p>
            <Lines lines={sample.after.lines} />
          </Step>
        </div>

        <div className="mt-4 grid gap-4 rounded-2xl border bg-card/60 p-6 text-sm md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="font-medium">What it still gets wrong</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
              {thin.length > 0 && <li>Lines like “{thin[0].length > 70 ? `${thin[0].slice(0, 67).trimEnd()}…` : thin[0]}” only restate activity. Delete them, or answer a question about what you built.</li>}
              <li>It can&apos;t know who used your project or what changed until you say so. Before the answer, no line had a result.</li>
              <li>Written by {sample.model}. A different model, or richer READMEs, give different wording.</li>
            </ul>
          </div>
          <a href="/samples/student-resume.pdf" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 justify-self-start rounded-full border px-4 py-2 transition-colors hover:bg-white/[0.04]">
            <FileText className="size-4" /> Open the {sample.pages}-page PDF
          </a>
        </div>
      </div>
    </section>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card/60 p-6 text-sm">
      <p className="text-xs text-muted-foreground">Step {n}</p>
      <h3 className="mt-1 text-base font-medium">{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
  )
}

function Lines({ lines }: { lines: string[] }) {
  return (
    <ul className="mt-1.5 list-disc space-y-1.5 pl-4 text-muted-foreground">
      {lines.map((l) => <li key={l}>{l}</li>)}
    </ul>
  )
}

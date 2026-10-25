import Link from "next/link"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { PLANS } from "@/lib/plans"

export const metadata = { title: "Help · DevProfile" }

const free = PLANS.free.limits

const sections: { title: string; blurb: string; items: { q: string; a: React.ReactNode }[] }[] = [
  {
    title: "Getting started",
    blurb: "From your sources to a first PDF.",
    items: [
      { q: "What should I add first?", a: <>Your GitHub username and an old resume or LinkedIn PDF if you have one. More sources mean more facts to write from. Add them on <Link href="/start/sources" className="underline underline-offset-4">Add sources</Link>.</> },
      { q: "Where do the lines come from?", a: "Every line is written from facts found in your own sources. Click the small source icon next to a line to see the exact passage it came from. Nothing is invented." },
      { q: "Why was something left off my resume?", a: "Everything has to fit on one page, so the weakest lines are moved off first. You'll find them under Improve, with a Restore button. Restoring pins it, and something weaker makes room." },
    ],
  },
  {
    title: "Editing your resume",
    blurb: "Change wording, order and design.",
    items: [
      { q: "How do I edit a line?", a: "Click the line to edit it in place. Hover a line to remove it, or use Ask AI to describe a change in your own words." },
      { q: "How do I change the design?", a: "Use the Design button above your resume. Compact and Two column fit the most; every design keeps text at 10pt or larger." },
      { q: "Can I reorder sections?", a: "Yes. Drag a section heading, or use the arrows that appear when you hover it. The default order is Skills, Experience, Education, Projects, Awards." },
    ],
  },
  {
    title: "Tailoring for a job",
    blurb: "A version of your resume for each application.",
    items: [
      { q: "How do I make a tailored resume?", a: <>Go to <Link href="/resume" className="underline underline-offset-4">Resumes</Link> and paste a job post or describe the role. You get a copy that leads with what matters for that job, plus a match report.</> },
      { q: "Does tailoring change my base resume?", a: "No. Lines you edit on a tailored resume change only that resume. Names, dates, links and contact details are shared." },
    ],
  },
  {
    title: "Downloads",
    blurb: "PDF, LaTeX and Overleaf.",
    items: [
      { q: "What do I get?", a: "A one-page PDF on every plan. From the menu next to Download PDF you can also get the .tex file or open it in Overleaf to edit by hand." },
      { q: "Where are my past downloads?", a: "Every PDF you download is kept on your Dashboard, so you always know exactly what you sent." },
    ],
  },
  {
    title: "Plans and billing",
    blurb: "What's free and what Pro adds.",
    items: [
      { q: "What's included on Free?", a: `Building, editing and downloading your resume, plus ${free.tailored} tailored resumes, ${free.fixes} AI fixes and chat edits, and ${free.updates} builds or source syncs a month.` },
      { q: "How do I upgrade or cancel?", a: <>On <Link href="/billing" className="underline underline-offset-4">Plan and billing</Link>. Cancelling never deletes anything.</> },
    ],
  },
  {
    title: "Your account",
    blurb: "Data, privacy and deleting things.",
    items: [
      { q: "How do I remove a source or delete my data?", a: <>On the <Link href="/record" className="underline underline-offset-4">Career Record</Link> page you can remove any single source, or delete everything.</> },
      { q: "How do I delete my account?", a: "Open the account menu at the bottom of the sidebar, choose Account settings, then delete your account there. It deletes your DevProfile data with it." },
    ],
  },
]

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-4xl py-6">
      <h2 className="text-3xl font-semibold tracking-[-0.03em]">How can we help?</h2>
      <p className="mt-2 text-muted-foreground">
        Quick answers below. Still stuck? Email <a href="mailto:dev@rusil.me" className="text-foreground underline underline-offset-4">dev@rusil.me</a> and a person will reply.
      </p>
      <div className="mt-10 divide-y divide-border">
        {sections.map((section) => (
          <section key={section.title} className="grid gap-4 py-8 md:grid-cols-[14rem_1fr] md:gap-10">
            <div>
              <h3 className="font-medium">{section.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{section.blurb}</p>
            </div>
            <Accordion type="multiple" className="rounded-3xl bg-card px-5">
              {section.items.map((item) => (
                <AccordionItem key={item.q} value={item.q} className="last:border-b-0">
                  <AccordionTrigger className="text-[15px]">{item.q}</AccordionTrigger>
                  <AccordionContent className="text-[15px] leading-relaxed text-muted-foreground">{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        ))}
      </div>
    </div>
  )
}

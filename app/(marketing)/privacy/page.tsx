export const metadata = { title: "Privacy · DevProfile", description: "What DevProfile keeps, who processes it, and how to remove it." }

// Plain description of what the product does with data. Not a legal document.
const sections = [
  {
    title: "What we keep",
    body: [
      "The sources you add: public GitHub data for the account you connect or name, PDFs and LinkedIn exports you upload, notes you paste, and pull request links. Uploaded files are stored privately under your account.",
      "What we make from them: your Career Record (entries and the facts behind each line), your resumes, job posts you paste to tailor a resume, and every PDF you download, kept exactly as downloaded.",
      "A log of AI calls (which step ran, tokens and cost), used to enforce daily limits and to keep costs in check.",
    ],
  },
  {
    title: "Who processes it",
    body: [
      "Clerk handles sign-in. Supabase stores your data and files. Your sources and requests are sent to our AI provider (Anthropic, or OpenAI where configured) to read your sources and write and edit your resume. Upstash counts requests for rate limits. Dodo Payments handles payments if you buy Pro; we never see your card.",
      "We don't sell your data, use it for advertising, or post anything anywhere for you. The free ATS checker reads the file you upload once and doesn't store it.",
    ],
  },
  {
    title: "How long we keep it",
    body: [
      "Until you remove it. Re-reading a source keeps the earlier text too, so the quotes behind older lines can still be checked.",
      "Payment records are kept by Dodo Payments as required for accounting, even after you delete your data.",
    ],
  },
  {
    title: "Your controls",
    body: [
      "On the Career Record page you can download everything as JSON, remove any single source (with the facts and lines that came only from it), or delete all your DevProfile data, including uploaded files and downloaded PDFs.",
      "Deleting your sign-in account is done from the account menu. Delete your data first if you want it gone too.",
      "Questions or requests: email dev@rusil.me.",
    ],
  },
]

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-32 pb-24 sm:px-6">
      <h1 className="text-4xl font-semibold tracking-[-0.03em]">Privacy</h1>
      <p className="mt-4 text-muted-foreground">How DevProfile handles what you give it, in plain terms.</p>
      <div className="mt-12 space-y-10">
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="text-lg font-medium">{s.title}</h2>
            <div className="mt-3 space-y-3 leading-relaxed text-muted-foreground">
              {s.body.map((p) => <p key={p}>{p}</p>)}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

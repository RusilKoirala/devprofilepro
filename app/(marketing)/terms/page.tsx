export const metadata = { title: "Terms · DevProfile", description: "The terms for using DevProfile, in plain words." }

// Plain-language terms that match how the product and billing actually work (docs/PRICING.md).
// Have them reviewed by a lawyer before relying on them.
const sections = [
  {
    title: "Using DevProfile",
    body: [
      "DevProfile turns sources you give it (your GitHub, files you upload, notes you type) into resumes. You need an account to use the app; the ATS checker works without one.",
      "Only add sources you're allowed to use. Don't use DevProfile to make resumes for someone else without their permission, to overload the service, or to get around its limits.",
    ],
  },
  {
    title: "Your content",
    body: [
      "What you add and the resumes made from it are yours. You let us store and process it only to run DevProfile for you, as described on the privacy page.",
      "DevProfile writes from your sources and checks every line against them, but it can still get things wrong. You're responsible for what you send to an employer, so read your resume before you send it.",
    ],
  },
  {
    title: "Plans and payments",
    body: [
      "Free has monthly limits on tailored resumes, AI fixes and syncs. Building your first resume, editing, checks and downloads are free on every plan.",
      "Pro is $12 a month and renews until you cancel, or $29 for a 3-month pass that ends after 90 days and never renews. Cancelling monthly keeps Pro until the end of the month you paid for.",
      "Payments are handled by Dodo Payments and aren't refunded. Very heavy use on Pro may switch to a faster model for the rest of the day; automated or abusive use can be paused.",
    ],
  },
  {
    title: "Ending",
    body: [
      "You can delete your data, or your whole account, at any time. Deleting your account deletes your DevProfile data and files.",
      "We may suspend accounts that break these terms. If we ever shut DevProfile down, we'll give notice so you can download your resumes first.",
    ],
  },
  {
    title: "Changes and contact",
    body: [
      "If these terms change in a way that matters, we'll say so in the app before it takes effect. Questions: dev@rusil.me.",
    ],
  },
]

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-32 pb-24 sm:px-6">
      <h1 className="text-4xl font-semibold tracking-[-0.03em]">Terms</h1>
      <p className="mt-4 text-muted-foreground">The terms for using DevProfile, in plain words.</p>
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

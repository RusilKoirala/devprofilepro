import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Logo } from "./logo"

const columns = [
  {
    title: "Product",
    links: [
      { href: "/#product", label: "Product" },
      { href: "/#features", label: "Features" },
      { href: "/#how-it-works", label: "How it works" },
      { href: "/ats-checker", label: "Free ATS checker" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/#faq", label: "FAQ" },
      { href: "/privacy", label: "Privacy" },
      { href: "mailto:dev@rusil.me", label: "Contact" },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[2fr_1fr_1fr]">
          <div className="max-w-xs space-y-3">
            <Logo />
            <p className="text-sm text-muted-foreground">
              One-page resumes, compiled from the work you&apos;ve already done.
            </p>
          </div>
          {columns.map((column) => (
            <div key={column.title}>
              <h2 className="mb-3 text-sm font-medium">{column.title}</h2>
              <ul className="-ml-3 space-y-0.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Button asChild variant="link" size="sm" className="h-8 text-muted-foreground">
                      <Link href={link.href}>{link.label}</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <Separator className="my-8" />
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} DevProfile. Not affiliated with GitHub, LinkedIn or X.
        </p>
      </div>
    </footer>
  )
}

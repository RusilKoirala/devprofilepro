"use client"

import Link from "next/link"
import { Menu } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { Logo } from "./logo"

const links = [
  { href: "/#product", label: "Product" },
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/ats-checker", label: "ATS checker" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
]

// `auth` holds the Clerk sign-in / dashboard controls; absent when Clerk isn't configured.
export function Navbar({ auth }: { auth?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300",
        scrolled ? "border-border bg-background/70 backdrop-blur-xl" : "border-transparent"
      )}
    >
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-6">
        <Logo />

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Button
              key={link.href}
              asChild
              variant="ghost"
              size="sm"
              className="rounded-full text-foreground/70 hover:bg-white/[0.06] hover:text-foreground"
            >
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
        </nav>

        <div className="col-start-3 flex items-center justify-end gap-2">
          {auth ? (
            <div className="hidden items-center gap-2 sm:flex">{auth}</div>
          ) : (
            <Button asChild size="sm" variant="secondary" className="hidden rounded-full px-4 sm:inline-flex">
              <Link href="/#waitlist">Join the waitlist</Link>
            </Button>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>
                  <Logo />
                </SheetTitle>
                <SheetDescription>Your resume, written from your work.</SheetDescription>
              </SheetHeader>
              <nav aria-label="Mobile" className="flex flex-col gap-1 px-4">
                {links.map((link) => (
                  <Button
                    key={link.href}
                    asChild
                    variant="ghost"
                    className="justify-start"
                    onClick={() => setOpen(false)}
                  >
                    <Link href={link.href}>{link.label}</Link>
                  </Button>
                ))}
                <Separator className="my-3" />
                {auth ? (
                  <div className="flex items-center gap-2">{auth}</div>
                ) : (
                  <Button asChild className="rounded-full" onClick={() => setOpen(false)}>
                    <Link href="/#waitlist">Join the waitlist</Link>
                  </Button>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

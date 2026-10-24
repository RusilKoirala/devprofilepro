"use client"

import Link from "next/link"
import { useState } from "react"
import { usePathname } from "next/navigation"
import { UserButton, useUser } from "@clerk/nextjs"
import { ChevronRight, Download, FileText, LayoutDashboard, Library, Plus, Sparkles } from "lucide-react"
import { LogoMark } from "@/components/marketing/logo"
import { UpgradeDialog } from "@/components/app/upgrade-dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { allowanceStates, type PlanUsage } from "@/lib/plans"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"

export interface ResumeLink {
  id: string
  title: string
  kind: "base" | "tailored"
}

export function AppSidebar({ resumes, usage }: { resumes: ResumeLink[]; usage: PlanUsage | null }) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="DevProfile" className="group-data-[collapsible=icon]:justify-center">
              <Link href="/home">
                <LogoMark className="size-7 shrink-0" />
                <span className="text-[15px] font-semibold tracking-tight group-data-[collapsible=icon]:hidden">DevProfile</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavLink href="/home" label="Dashboard" icon={LayoutDashboard} active={pathname === "/home"} />
              <ResumesMenu resumes={resumes} pathname={pathname} />
              <NavLink href="/record" label="Career Record" icon={Library} active={pathname === "/record"} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Sources</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/start/sources"} tooltip="Add sources">
                  <Link href="/start/sources">
                    <Plus />
                    <span>Add sources</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Export my data">
                  <a href="/api/data">
                    <Download />
                    <span>Export my data</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {usage?.plan === "free" && <UpgradeCard usage={usage} />}
        <UserRow />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

// Always in view on Free: how many tailored resumes are left, and one click to Pro.
function UpgradeCard({ usage }: { usage: PlanUsage }) {
  const tailored = allowanceStates(usage).find((a) => a.key === "tailored")!
  const reason =
    tailored.state === "out"
      ? `You've used all ${tailored.limit} free tailored resumes this month.`
      : `You have ${tailored.left} of ${tailored.limit} free tailored resumes left this month.`
  return (
    <>
      <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-3 group-data-[collapsible=icon]:hidden">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">Free plan</span>
          <span className={tailored.state === "ok" ? "text-sidebar-foreground/60" : "text-amber-400"}>
            {tailored.left} of {tailored.limit} tailored left
          </span>
        </div>
        <Progress
          value={((tailored.limit! - tailored.left!) / tailored.limit!) * 100}
          className={`mt-2 h-1 ${tailored.state === "ok" ? "" : "[&>[data-slot=progress-indicator]]:bg-amber-400"}`}
        />
        <p className="mt-2.5 text-xs leading-relaxed text-sidebar-foreground/60">Applying a lot? Pro tailors a resume for every job.</p>
        <UpgradeDialog reason={reason}>
          <Button size="sm" className="mt-3 h-8 w-full rounded-full"><Sparkles /> Upgrade to Pro</Button>
        </UpgradeDialog>
      </div>
      <SidebarMenu className="hidden group-data-[collapsible=icon]:flex">
        <SidebarMenuItem>
          <UpgradeDialog reason={reason}>
            <SidebarMenuButton tooltip="Upgrade to Pro"><Sparkles /></SidebarMenuButton>
          </UpgradeDialog>
        </SidebarMenuItem>
      </SidebarMenu>
    </>
  )
}

function UserRow() {
  const { user } = useUser()
  return (
    <div className="flex items-center gap-2.5 rounded-md p-1 group-data-[collapsible=icon]:p-0">
      <UserButton />
      <span className="truncate text-sm text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
        {user?.primaryEmailAddress?.emailAddress ?? ""}
      </span>
    </div>
  )
}

function NavLink({ href, label, icon: Icon, active }: { href: string; label: string; icon: typeof FileText; active: boolean }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} tooltip={label}>
        <Link href={href}>
          <Icon />
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

// "Resumes" goes to /resume (every resume); the chevron folds the list of resumes in and out.
// With the sidebar collapsed to icons, clicking it also expands the sidebar with the list open.
// Plain state rather than Radix Collapsible: its generated ids didn't match between server and client.
function ResumesMenu({ resumes, pathname }: { resumes: ResumeLink[]; pathname: string }) {
  const { state, isMobile, setOpen } = useSidebar()
  const [listOpen, setListOpen] = useState(true)
  const items = resumes.map((r) => ({ ...r, href: `/resume/${r.id}`, label: r.kind === "base" ? "Base resume" : r.title }))
  const newHref = resumes.length ? "/resume" : "/start"

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={pathname === "/resume"} tooltip="Resumes">
        <Link
          href="/resume"
          onClick={() => {
            if (state !== "collapsed" || isMobile) return
            setOpen(true)
            setListOpen(true)
          }}
        >
          <FileText />
          <span>Resumes</span>
        </Link>
      </SidebarMenuButton>
      <SidebarMenuAction onClick={() => setListOpen((o) => !o)} aria-expanded={listOpen} aria-label={listOpen ? "Hide resume list" : "Show resume list"}>
        <ChevronRight className={`transition-transform duration-200 ${listOpen ? "rotate-90" : ""}`} />
      </SidebarMenuAction>
      {listOpen && (
        <SidebarMenuSub>
          {items.map((r) => (
            <SidebarMenuSubItem key={r.id}>
              <SidebarMenuSubButton asChild isActive={pathname === r.href}>
                <Link href={r.href}><span>{r.label}</span></Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
          <SidebarMenuSubItem>
            <SidebarMenuSubButton asChild className="text-sidebar-foreground/70">
              <Link href={newHref}><Plus /> <span>New resume</span></Link>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  )
}

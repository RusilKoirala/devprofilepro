"use client"

import Link from "next/link"
import { useState } from "react"
import { usePathname } from "next/navigation"
import { UserButton, useUser } from "@clerk/nextjs"
import { ChevronRight, Download, FileText, LayoutDashboard, Library, Plus } from "lucide-react"
import { LogoMark } from "@/components/marketing/logo"
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

export function AppSidebar({ resumes }: { resumes: ResumeLink[] }) {
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
                <SidebarMenuButton asChild isActive={pathname === "/start"} tooltip="Add sources">
                  <Link href="/start">
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
        <UserRow />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
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

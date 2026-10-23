"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserButton, useUser } from "@clerk/nextjs"
import { Download, FileText, LayoutDashboard, Library, Plus } from "lucide-react"
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
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

export function AppSidebar({ resumeHref }: { resumeHref: string }) {
  const pathname = usePathname()
  const main = [
    { href: "/home", label: "Dashboard", icon: LayoutDashboard, active: pathname === "/home" },
    { href: resumeHref, label: "Resume", icon: FileText, active: pathname.startsWith("/resume") },
    { href: "/record", label: "Career Record", icon: Library, active: pathname === "/record" },
  ]

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
              {main.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton asChild isActive={item.active} tooltip={item.label}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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

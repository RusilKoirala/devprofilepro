"use client"

import Link from "next/link"
import { useSyncExternalStore } from "react"
import { useClerk, useUser } from "@clerk/nextjs"
import { ChevronsUpDown, CircleHelp, ExternalLink, House, LogOut, UserRound } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar"

function Avatar({ src, label, pro, className = "size-8" }: { src?: string; label: string; pro?: boolean; className?: string }) {
  const face = src ? (
    // eslint-disable-next-line @next/next/no-img-element -- Clerk serves the avatar from its own CDN
    <img src={src} alt="" className="size-full rounded-full object-cover" />
  ) : (
    <span aria-hidden="true" className="grid size-full place-items-center rounded-full bg-sidebar-accent text-xs font-medium uppercase">{label.slice(0, 1)}</span>
  )
  // Pro members get a blue ring that drifts to lavender on one side, with a gap before the photo:
  // a small thank-you that shows wherever their avatar does.
  return pro ? (
    <span className={`${className} shrink-0 rounded-full bg-[conic-gradient(from_150deg,#3d7bff_0deg,#4c8dff_200deg,#b9aaff_300deg,#3d7bff_360deg)] p-[2.5px]`}>
      <span className="block size-full rounded-full bg-sidebar p-[2px]">{face}</span>
    </span>
  ) : (
    <span className={`${className} shrink-0 rounded-full ring-1 ring-sidebar-border`}>{face}</span>
  )
}

// Dark pill with a thin blue-to-lavender edge, matching the avatar ring.
function ProPill() {
  return (
    <span className="rounded-full border border-transparent px-2 py-px text-[11px] font-medium text-foreground [background:linear-gradient(var(--popover),var(--popover))_padding-box,linear-gradient(90deg,#3d7bff,#b9aaff)_border-box]">
      Pro
    </span>
  )
}

// The sidebar's account row and its menu, in our own style rather than Clerk's popover.
// Account settings opens Clerk's profile window: that's where the account itself is deleted.
export function AccountMenu({ pro = false }: { pro?: boolean }) {
  const { user } = useUser()
  const { signOut, openUserProfile } = useClerk()
  const { isMobile } = useSidebar()
  const email = user?.primaryEmailAddress?.emailAddress ?? ""
  const name = user?.fullName || email
  // Radix's generated ids differ between server and client, so the menu attaches after hydration.
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)

  const button = (
    <SidebarMenuButton size="lg" tooltip={email || "Account"} className="data-[state=open]:bg-sidebar-accent">
      <Avatar src={user?.imageUrl} label={name || "?"} pro={pro} />
      <span className="min-w-0 flex-1 truncate text-sm text-sidebar-foreground/80">{email}</span>
      <ChevronsUpDown className="ml-auto size-4 text-sidebar-foreground/60" />
    </SidebarMenuButton>
  )
  if (!mounted) return <SidebarMenu><SidebarMenuItem>{button}</SidebarMenuItem></SidebarMenu>

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>{button}</DropdownMenuTrigger>
          <DropdownMenuContent side={isMobile ? "top" : "right"} align="end" sideOffset={10} className="w-64">
            <div className="flex items-center gap-3 rounded-xl bg-secondary px-2.5 py-2.5">
              <Avatar src={user?.imageUrl} label={name || "?"} pro={pro} className="size-9" />
              <div className="min-w-0">
                {(user?.fullName || pro) && (
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                    {user?.fullName}
                    {pro && <ProPill />}
                  </p>
                )}
                <p className="truncate text-sm text-muted-foreground">{email}</p>
              </div>
            </div>
            <DropdownMenuSeparator className="my-1.5" />
            <DropdownMenuItem asChild>
              <Link href="/help"><CircleHelp /> Help</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/" target="_blank" rel="noreferrer"><House /> Home <ExternalLink className="ml-auto text-muted-foreground" /></a>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openUserProfile()}>
              <UserRound /> Account settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1.5" />
            <DropdownMenuItem variant="destructive" onSelect={() => signOut({ redirectUrl: "/" })}>
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

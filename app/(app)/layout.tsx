import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import { isAppEnabled } from "@/lib/access"
import { AppClerkProvider } from "@/components/app/clerk-provider"
import { AppSidebar } from "@/components/app/app-sidebar"
import { PageTitle } from "@/components/app/page-title"
import { SetupNotice } from "@/components/app/setup-notice"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"

// The layout persists across navigations, so this query runs once, not on every click.
async function baseResumeHref(): Promise<string> {
  if (!isSupabaseConfigured()) return "/start"
  try {
    const supabase = await createClient()
    const { data } = await supabase.from("resumes").select("id").eq("kind", "base").maybeSingle()
    return data ? `/resume/${data.id}` : "/start"
  } catch {
    return "/start"
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!isAppEnabled()) notFound()
  const [cookieStore, resumeHref] = await Promise.all([cookies(), baseResumeHref()])
  // Read the saved sidebar state on the server so it renders open/collapsed without a flash.
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false"

  return (
    <AppClerkProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar resumeHref={resumeHref} />
        <SidebarInset className="bg-background">
          <header className="flex h-14 shrink-0 items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1 text-muted-foreground" />
            <PageTitle />
          </header>
          <div className="flex-1 px-4 pb-10 md:px-8">{isSupabaseConfigured() ? children : <SetupNotice />}</div>
        </SidebarInset>
      </SidebarProvider>
    </AppClerkProvider>
  )
}

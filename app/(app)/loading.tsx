import { Skeleton } from "@/components/ui/skeleton"

// Shown instantly on navigation while the server loads the page.
export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 pt-4">
      <Skeleton className="h-[74px] rounded-xl" />
      <div className="space-y-2 rounded-2xl border border-border bg-card p-2">
        <div className="space-y-2 px-3 pt-2 pb-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-[72px] rounded-xl bg-background" />
        <Skeleton className="h-[72px] rounded-xl bg-background" />
      </div>
    </div>
  )
}

import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-6 pt-4">
      <div className="flex justify-between">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-9 w-44" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="aspect-[8.5/11] rounded-xl" />
      </div>
    </div>
  )
}

import { Skeleton } from '@monprojetpro/ui'

export default function StatsLoadingState() {
  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <Skeleton className="h-9 w-48 mb-2" />
        <Skeleton className="h-5 w-80" />
      </div>

      {/* Sub-nav skeleton */}
      <div className="flex gap-1 border-b pb-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-28" />
      </div>

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>

      {/* Chart skeleton */}
      <Skeleton className="h-48 w-full rounded-lg" />

      {/* Table skeleton */}
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  )
}

'use client'

import { Skeleton } from '@monprojetpro/ui'

export function DocumentSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-4" data-testid="document-skeleton">
      {/* Header row */}
      <div className="flex items-center justify-between pb-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>
      {/* Table header */}
      <div className="flex gap-4 border-b border-border/50 pb-2">
        <Skeleton className="h-4 w-8" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
      {/* Table rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  )
}

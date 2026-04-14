'use client'

import { Skeleton } from '@monprojetpro/ui'

export function DocumentViewerSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4" data-testid="document-viewer-skeleton">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-6 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </div>
      {/* Content area */}
      <div className="rounded-lg border border-border/50 p-6">
        <Skeleton className="mb-4 h-8 w-3/4" />
        <Skeleton className="mb-3 h-4 w-full" />
        <Skeleton className="mb-3 h-4 w-5/6" />
        <Skeleton className="mb-3 h-4 w-4/5" />
        <Skeleton className="mb-6 h-4 w-2/3" />
        <Skeleton className="mb-4 h-6 w-1/2" />
        <Skeleton className="mb-3 h-4 w-full" />
        <Skeleton className="mb-3 h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  )
}

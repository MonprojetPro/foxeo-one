import { Skeleton } from '@monprojetpro/ui'

interface FolderTreeSkeletonProps {
  layout?: 'sidebar' | 'horizontal'
}

export function FolderTreeSkeleton({ layout = 'sidebar' }: FolderTreeSkeletonProps) {
  if (layout === 'horizontal') {
    return (
      <div className="flex flex-wrap items-center gap-2" data-testid="folder-tree-skeleton">
        <Skeleton className="h-8 w-36 rounded-full" />
        <Skeleton className="h-8 w-28 rounded-full" />
        <Skeleton className="h-8 w-32 rounded-full" />
        <Skeleton className="h-8 w-32 rounded-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-2" data-testid="folder-tree-skeleton">
      <Skeleton className="h-8 w-full rounded" />
      <Skeleton className="h-8 w-full rounded" />
      <Skeleton className="h-8 w-3/4 rounded" />
      <Skeleton className="h-8 w-5/6 rounded" />
    </div>
  )
}

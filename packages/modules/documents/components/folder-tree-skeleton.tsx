import { Skeleton } from '@monprojetpro/ui'

export function FolderTreeSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-2" data-testid="folder-tree-skeleton">
      <Skeleton className="h-8 w-full rounded" />
      <Skeleton className="h-8 w-full rounded" />
      <Skeleton className="h-8 w-3/4 rounded" />
      <Skeleton className="h-8 w-5/6 rounded" />
    </div>
  )
}

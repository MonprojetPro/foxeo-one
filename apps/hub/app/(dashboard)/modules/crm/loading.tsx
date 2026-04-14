import { Skeleton } from '@monprojetpro/ui'

export default function CRMLoadingState() {
  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <Skeleton className="h-9 w-32 mb-2" />
        <Skeleton className="h-5 w-64" />
      </div>

      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-10 w-48" />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  )
}

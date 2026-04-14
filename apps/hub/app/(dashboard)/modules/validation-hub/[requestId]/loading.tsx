import { Skeleton } from '@monprojetpro/ui'

export default function RequestDetailLoading() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-24 w-full" />
      <div className="grid grid-cols-1 lg:grid-cols-[70%_30%] gap-6">
        <div className="space-y-6">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  )
}

import { Skeleton } from '@monprojetpro/ui'

export default function CommunicationLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-72" />
        <Skeleton className="h-5 w-96" />
      </div>

      <div className="space-y-8 rounded-xl border border-border bg-card p-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <div className="flex gap-2">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 flex-1" />
            </div>
          </div>
        ))}
        <div className="flex justify-end">
          <Skeleton className="h-10 w-48" />
        </div>
      </div>
    </div>
  )
}

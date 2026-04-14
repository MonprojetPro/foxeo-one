import { Skeleton } from '@monprojetpro/ui'

export default function ChatLoadingState() {
  return (
    <div className="flex h-full">
      {/* Sidebar skeleton */}
      <aside className="w-80 shrink-0 border-r">
        <div className="border-b p-4">
          <Skeleton className="h-6 w-24 mb-1" />
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="flex flex-col gap-2 p-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-44" />
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main area skeleton */}
      <main className="flex flex-1 items-center justify-center">
        <Skeleton className="h-8 w-56" />
      </main>
    </div>
  )
}

import { ChatSkeleton } from '@monprojetpro/modules-chat'
import { Skeleton } from '@monprojetpro/ui'

export default function ChatConversationLoading() {
  return (
    <div className="flex h-full">
      {/* Sidebar skeleton */}
      <aside className="w-80 shrink-0 border-r">
        <div className="border-b p-4">
          <Skeleton className="h-6 w-24 mb-1" />
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="flex flex-col gap-2 p-2">
          {Array.from({ length: 5 }).map((_, i) => (
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
      {/* Chat window skeleton */}
      <main className="flex flex-1 flex-col">
        <ChatSkeleton />
      </main>
    </div>
  )
}

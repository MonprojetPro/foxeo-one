'use client'

import { Skeleton } from '@monprojetpro/ui'

export function ChatSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4" data-testid="chat-skeleton">
      {/* Messages from operator (left) */}
      <div className="flex items-end gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-12 w-48 rounded-2xl rounded-bl-none" />
      </div>
      {/* Message from client (right) */}
      <div className="flex items-end justify-end gap-2">
        <Skeleton className="h-10 w-64 rounded-2xl rounded-br-none" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      {/* Message from operator (left) */}
      <div className="flex items-end gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-16 w-56 rounded-2xl rounded-bl-none" />
      </div>
      {/* Message from client (right) */}
      <div className="flex items-end justify-end gap-2">
        <Skeleton className="h-10 w-40 rounded-2xl rounded-br-none" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      {/* Input skeleton */}
      <div className="mt-auto flex gap-2 pt-4">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>
    </div>
  )
}

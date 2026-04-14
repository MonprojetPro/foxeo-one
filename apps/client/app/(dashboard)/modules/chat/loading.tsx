import { ChatSkeleton } from '@monprojetpro/modules-chat'
import { Skeleton } from '@monprojetpro/ui'

export default function ClientChatLoadingState() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <Skeleton className="h-6 w-24 mb-1" />
        <Skeleton className="h-4 w-52" />
      </div>
      <div className="flex-1">
        <ChatSkeleton />
      </div>
    </div>
  )
}

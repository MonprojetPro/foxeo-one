import { Skeleton } from '@monprojetpro/ui'

export default function MeetingRoomLoading() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-[400px] w-full rounded-xl" />
    </div>
  )
}

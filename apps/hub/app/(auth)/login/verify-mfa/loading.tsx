import { Skeleton } from '@monprojetpro/ui'

export default function VerifyMfaLoading() {
  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center space-y-2">
        <Skeleton className="h-8 w-40 mx-auto" />
        <Skeleton className="h-4 w-56 mx-auto" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-4 w-48 mx-auto" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}

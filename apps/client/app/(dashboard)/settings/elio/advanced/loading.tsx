import { Skeleton } from '@monprojetpro/ui'

export default function ElioAdvancedSettingsLoading() {
  return (
    <div className="max-w-3xl space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-16 w-full rounded-lg" />
      <div className="space-y-6 rounded-xl border border-border bg-card p-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  )
}

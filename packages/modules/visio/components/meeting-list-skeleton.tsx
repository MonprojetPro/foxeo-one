import { BlockSkeleton, RowSkeleton } from '@monprojetpro/ui'

/**
 * Skeleton cockpit pour la liste de meetings (animate-pulse, bg-white/5).
 * Remplace les Skeleton generiques par les briques partagees du cockpit.
 */
export function MeetingListSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Simule le CockpitHeader */}
      <BlockSkeleton className="h-20 w-full" />
      {/* Simule les pill-tabs */}
      <div className="flex gap-2">
        {[96, 72, 80].map((w, i) => (
          <div key={i} className={`h-9 w-${w} animate-pulse rounded-xl bg-white/5`} />
        ))}
      </div>
      {/* Simule les lignes de table */}
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <RowSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

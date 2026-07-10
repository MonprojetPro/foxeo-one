'use client'

import { HeroStatSkeleton, RowSkeleton } from '@monprojetpro/ui'

/**
 * Skeleton cockpit pour la vue hub Documents.
 * Remplace les blocs génériques par des skeletons cohérents avec le design system.
 */
export function DocumentSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6" data-testid="document-skeleton">
      {/* En-tête cockpit */}
      <div className="h-20 animate-pulse rounded-2xl bg-white/5" />

      {/* Cartes KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <HeroStatSkeleton />
        <HeroStatSkeleton />
        <HeroStatSkeleton />
      </div>

      {/* Barre de filtres */}
      <div className="h-24 animate-pulse rounded-2xl bg-white/5" />

      {/* Groupes documents */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
            <div className="h-4 w-4 animate-pulse rounded bg-white/10" />
            <div className="h-4 w-36 animate-pulse rounded bg-white/10" />
          </div>
          <div className="flex flex-col gap-2 p-3">
            <RowSkeleton />
            <RowSkeleton />
          </div>
        </div>
      ))}
    </div>
  )
}

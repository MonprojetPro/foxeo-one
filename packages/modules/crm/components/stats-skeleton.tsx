'use client'

import { StatCardSkeleton, BlockSkeleton, RowSkeleton } from '@monprojetpro/ui'

export function StatsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Grille KPI skeleton — 5 cartes cockpit */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Graphique skeleton — bloc pleine largeur */}
      <BlockSkeleton className="h-48 w-full" />

      {/* Table skeleton — wrapper cockpit + lignes */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <RowSkeleton key={i} className="h-12" />
        ))}
      </div>
    </div>
  )
}

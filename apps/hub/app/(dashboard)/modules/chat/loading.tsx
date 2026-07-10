import { BlockSkeleton, RowSkeleton } from '@monprojetpro/ui'

/** Skeleton cockpit de la liste des conversations (aucune sélection). */
export default function ChatLoadingState() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* En-tête cockpit — skeleton */}
      <div className="shrink-0 px-4 pt-4 pb-3">
        <BlockSkeleton className="h-[5.5rem] rounded-2xl" />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar skeleton */}
        <aside className="w-72 shrink-0 border-r border-white/10">
          {/* Champ de recherche */}
          <div className="px-3 pt-3 pb-2">
            <div className="h-8 animate-pulse rounded-lg bg-white/5" />
          </div>
          {/* Items de conversation */}
          <div className="flex flex-col gap-1 px-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-3">
                {/* Avatar */}
                <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-white/5" />
                <div className="flex-1 space-y-1.5">
                  <RowSkeleton className="w-28" />
                  <RowSkeleton className="w-44 h-2.5" />
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Zone vide — skeleton centré */}
        <main className="flex flex-1 items-center justify-center">
          <BlockSkeleton className="h-36 w-64 rounded-2xl" />
        </main>
      </div>
    </div>
  )
}

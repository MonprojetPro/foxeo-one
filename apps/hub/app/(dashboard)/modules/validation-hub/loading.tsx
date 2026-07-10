// Squelette cockpit de la file d'attente Validation Hub
import { BlockSkeleton } from '@monprojetpro/ui'

export default function ValidationHubLoadingState() {
  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      {/* En-tête cockpit */}
      <BlockSkeleton className="h-[4.5rem] w-full" />

      {/* Pills filtres */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <BlockSkeleton className="h-9 w-28" />
          <BlockSkeleton className="h-9 w-28" />
          <BlockSkeleton className="h-9 w-36" />
          <BlockSkeleton className="h-9 w-32" />
        </div>
        <div className="flex gap-2">
          <BlockSkeleton className="h-9 w-24" />
          <BlockSkeleton className="h-9 w-24" />
          <BlockSkeleton className="h-9 w-28" />
        </div>
      </div>

      {/* Cartes demandes */}
      <div className="flex flex-col gap-3">
        {[...Array(4)].map((_, i) => (
          <BlockSkeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  )
}

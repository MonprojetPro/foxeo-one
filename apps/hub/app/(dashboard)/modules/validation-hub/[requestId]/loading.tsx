// Squelette cockpit de la page de détail d'une demande de validation
import { BlockSkeleton } from '@monprojetpro/ui'

export default function RequestDetailLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* En-tête de la demande */}
      <BlockSkeleton className="h-24 w-full" />
      {/* Raccourci chat */}
      <BlockSkeleton className="h-9 w-56" />
      {/* Layout 2 colonnes */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[70%_30%]">
        <div className="space-y-6">
          <BlockSkeleton className="h-36 w-full" />
          <BlockSkeleton className="h-72 w-full" />
        </div>
        <div className="space-y-6">
          <BlockSkeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  )
}

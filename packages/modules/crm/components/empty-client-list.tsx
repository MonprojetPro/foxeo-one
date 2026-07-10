'use client'

import { Button } from '@monprojetpro/ui'
import { Search, Users } from 'lucide-react'

interface EmptyClientListProps {
  hasFilters?: boolean
  onCreateClient?: () => void
}

export function EmptyClientList({
  hasFilters = false,
  onCreateClient
}: EmptyClientListProps) {
  // Empty state "aucun résultat de recherche" — style cockpit dashed
  if (hasFilters) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-14 text-center">
        {/* Pastille icône loupe */}
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-gray-400">
          <Search className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium text-gray-300">Aucun résultat</p>
        <p className="mt-1 text-xs text-gray-500">
          Aucun client ne correspond à vos critères de recherche ou de filtres.
        </p>
      </div>
    )
  }

  // Empty state "liste vide" — style cockpit dashed avec action
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-14 text-center">
      {/* Pastille icône utilisateurs */}
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-gray-400">
        <Users className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium text-gray-300">Aucun client</p>
      <p className="mt-1 text-xs text-gray-500">
        Commencez par créer votre premier client pour gérer votre portefeuille.
      </p>
      {onCreateClient && (
        <div className="mt-4">
          <Button onClick={onCreateClient}>
            Créer un client
          </Button>
        </div>
      )}
    </div>
  )
}

EmptyClientList.displayName = 'EmptyClientList'

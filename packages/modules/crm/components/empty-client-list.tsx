'use client'

import { EmptyState, Button } from '@monprojetpro/ui'

interface EmptyClientListProps {
  hasFilters?: boolean
  onCreateClient?: () => void
}

export function EmptyClientList({
  hasFilters = false,
  onCreateClient
}: EmptyClientListProps) {
  if (hasFilters) {
    return (
      <EmptyState
        title="Aucun résultat"
        description="Aucun client ne correspond à vos critères de recherche ou de filtres."
        icon="search"
      />
    )
  }

  return (
    <EmptyState
      title="Aucun client"
      description="Commencez par créer votre premier client pour gérer votre portefeuille."
      icon="users"
      action={
        onCreateClient ? (
          <Button onClick={onCreateClient}>
            Créer un client
          </Button>
        ) : undefined
      }
    />
  )
}

EmptyClientList.displayName = 'EmptyClientList'

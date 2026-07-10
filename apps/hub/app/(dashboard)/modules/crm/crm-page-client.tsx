'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ClientList,
  ClientSearch,
  ClientFiltersPanel,
  EmptyClientList,
  CreateClientDialog,
  ImportCsvDialog,
  useClients,
  type ClientFilters,
  type ClientListItem,
} from '@monprojetpro/modules-crm'
import { useOnlineUsers } from '@monprojetpro/modules-chat'
import { CockpitHeader, CockpitCallout } from '@monprojetpro/ui'
import { Users, AlertCircle } from 'lucide-react'

interface CRMPageClientProps {
  initialClients: ClientListItem[]
}

export function CRMPageClient({ initialClients }: CRMPageClientProps) {
  const router = useRouter()
  const onlineUserIds = useOnlineUsers()

  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<ClientFilters>({})

  const { data: clients = [], isLoading, error } = useClients(filters, initialClients)

  // Filtrage côté client (< 500 clients)
  const filteredClients = clients.filter((client) => {
    if (search) {
      const searchLower = search.toLowerCase()
      const matchesSearch =
        client.name.toLowerCase().includes(searchLower) ||
        client.company.toLowerCase().includes(searchLower) ||
        (client.email && client.email.toLowerCase().includes(searchLower)) ||
        (client.sector && client.sector.toLowerCase().includes(searchLower))

      if (!matchesSearch) return false
    }

    if (filters.clientType && filters.clientType.length > 0) {
      if (!filters.clientType.includes(client.clientType)) return false
    }

    if (filters.status && filters.status.length > 0) {
      if (!filters.status.includes(client.status)) return false
    }

    return true
  })

  const handleRowClick = (client: ClientListItem) => {
    router.push(`/modules/crm/clients/${client.id}`)
  }

  // --- État de chargement (skeleton cockpit) ---
  if (isLoading && initialClients.length === 0) {
    return (
      <div className="space-y-6 p-6 md:p-8">
        {/* Skeleton titre */}
        <div className="h-8 w-48 bg-white/5 animate-pulse rounded-xl" />
        {/* Skeleton barre de recherche */}
        <div className="h-10 w-full max-w-md bg-white/5 animate-pulse rounded-xl" />
        {/* Skeleton lignes tableau */}
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-white/5 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  // --- État d'erreur (callout cockpit rouge) ---
  if (error) {
    return (
      <div className="p-6 md:p-8">
        <CockpitCallout tone="red" icon={AlertCircle}>
          {error.message}
        </CockpitCallout>
      </div>
    )
  }

  const hasFilters =
    search !== '' ||
    (filters.clientType !== undefined && filters.clientType.length > 0) ||
    (filters.status !== undefined && filters.status.length > 0) ||
    (filters.sector !== undefined && filters.sector.length > 0)

  const showEmptyState = filteredClients.length === 0

  return (
    <div className="space-y-6 p-6 md:p-8">
      {/* En-tête cockpit Hub */}
      <CockpitHeader
        icon={Users}
        title="Clients"
        subtitle="Gérez vos clients et suivez vos relations"
        actions={
          <div className="flex gap-2 shrink-0">
            <ImportCsvDialog />
            <CreateClientDialog />
          </div>
        }
      />

      {/* Barre recherche + filtres — conteneur cockpit */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 flex flex-col sm:flex-row gap-3">
        <ClientSearch onSearchChange={setSearch} />
        <ClientFiltersPanel filters={filters} onFiltersChange={setFilters} />
      </div>

      {/* Tableau / états vides — inchangés */}
      {showEmptyState ? (
        <EmptyClientList hasFilters={hasFilters} />
      ) : (
        <ClientList
          clients={filteredClients}
          onRowClick={handleRowClick}
          onlineUserIds={onlineUserIds}
          showCreateButton={false}
        />
      )}
    </div>
  )
}

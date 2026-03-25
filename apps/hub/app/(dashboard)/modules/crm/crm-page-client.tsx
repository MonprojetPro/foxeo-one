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
} from '@foxeo/modules-crm'
import { useOnlineUsers } from '@foxeo/modules-chat'

interface CRMPageClientProps {
  initialClients: ClientListItem[]
}

export function CRMPageClient({ initialClients }: CRMPageClientProps) {
  const router = useRouter()
  const onlineUserIds = useOnlineUsers()

  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<ClientFilters>({})

  const { data: clients = [], isLoading, error } = useClients(filters, initialClients)

  // Client-side filtering (< 500 clients)
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

  if (isLoading && initialClients.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-10 w-full max-w-md bg-muted rounded animate-pulse" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-card border border-border rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-destructive">
        Erreur: {error.message}
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground">
            Gérez vos clients et suivez vos relations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportCsvDialog />
          <CreateClientDialog />
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <ClientSearch onSearchChange={setSearch} />
        <ClientFiltersPanel filters={filters} onFiltersChange={setFilters} />
      </div>

      {/* Table / Empty states */}
      {showEmptyState ? (
        <EmptyClientList
          hasFilters={hasFilters}
          onCreateClient={() => {}}
        />
      ) : (
        <ClientList clients={filteredClients} onRowClick={handleRowClick} onlineUserIds={onlineUserIds} />
      )}
    </div>
  )
}

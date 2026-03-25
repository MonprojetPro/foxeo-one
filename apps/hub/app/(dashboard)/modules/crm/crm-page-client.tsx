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
        hasFilters ? (
          <EmptyClientList hasFilters />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
            <p className="text-lg font-medium text-foreground mb-1">Aucun client pour le moment</p>
            <p className="text-sm text-muted-foreground mb-4">Commencez par créer votre premier client</p>
            <CreateClientDialog />
          </div>
        )
      ) : (
        <ClientList clients={filteredClients} onRowClick={handleRowClick} onlineUserIds={onlineUserIds} />
      )}
    </div>
  )
}

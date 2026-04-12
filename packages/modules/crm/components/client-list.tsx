'use client'

import { useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { DataTable, type ColumnDef } from '@monprojetpro/ui'
import { Badge, Button } from '@monprojetpro/ui'
import { showSuccess, showError } from '@monprojetpro/ui'
import { CreateClientDialog } from './create-client-dialog'
import { ImportCsvDialog } from './import-csv-dialog'
import { PinButton } from './pin-button'
import { ClientStatusBadge } from './client-status-badge'
import { PresenceDot } from './presence-dot'
import { reactivateClient } from '../actions/reactivate-client'
import type { ClientListItem, ClientType } from '../types/crm.types'

interface ClientListProps {
  clients: ClientListItem[]
  onRowClick?: (client: ClientListItem) => void
  showCreateButton?: boolean
  /** AC4 (Story 3.5): List of client IDs currently online — provided by parent via useOnlineUsers() */
  onlineUserIds?: string[]
}

// Type badge variants and labels
const clientTypeConfig: Record<ClientType, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  'complet': { label: 'Complet', variant: 'default' },
  'direct_one': { label: 'Direct One', variant: 'secondary' },
  'ponctuel': { label: 'Ponctuel', variant: 'outline' }
}

// Format date to FR locale
const formatDate = (isoDate: string): string => {
  const date = new Date(isoDate)
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

// Check if a client is currently deferred
const isDeferred = (client: ClientListItem): boolean =>
  !!client.deferredUntil && new Date(client.deferredUntil) > new Date()

// Prospect jamais vu par MiKL → badge "Nouveau"
const isNewProspect = (client: ClientListItem): boolean =>
  client.status === 'prospect' && client.hubSeenAt == null

// Story 9.5c: Check if archived client can still be reactivated
const canReactivate = (client: ClientListItem): boolean =>
  client.status === 'archived' &&
  (!client.retentionUntil || new Date(client.retentionUntil) > new Date())

function ReactivateButton({ clientId }: { clientId: string }) {
  const [isPending, startTransition] = useTransition()
  const queryClient = useQueryClient()

  const handleReactivate = (e: React.MouseEvent) => {
    e.stopPropagation()
    startTransition(async () => {
      const result = await reactivateClient({ clientId })
      if (result.error) {
        showError(result.error.message)
        return
      }
      showSuccess('Client réactivé')
      await queryClient.invalidateQueries({ queryKey: ['clients'] })
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={handleReactivate}
      data-testid={`reactivate-button-${clientId}`}
    >
      {isPending ? '...' : 'Réactiver'}
    </Button>
  )
}

export function ClientList({ clients, onRowClick, showCreateButton = true, onlineUserIds = [] }: ClientListProps) {
  const onlineSet = new Set(onlineUserIds)

  const columns: ColumnDef<ClientListItem>[] = [
    {
      id: 'pin',
      header: '',
      accessorKey: 'isPinned',
      cell: (client) => (
        <PinButton clientId={client.id} isPinned={client.isPinned ?? false} />
      ),
    },
    {
      id: 'name',
      header: 'Nom',
      accessorKey: 'name',
      cell: (client) => (
        <div className="flex items-center gap-2">
          {/* AC4 (Story 3.5): Realtime presence dot next to client name */}
          <PresenceDot isOnline={onlineSet.has(client.id)} clientId={client.id} />
          <span>{client.firstName ? `${client.firstName} ${client.name}` : client.name}</span>
          {isNewProspect(client) && (
            <Badge
              variant="default"
              className="text-xs bg-blue-500 text-white border-0 animate-pulse"
              data-testid={`new-prospect-badge-${client.id}`}
            >
              Nouveau
            </Badge>
          )}
          {isDeferred(client) && (
            <Badge variant="outline" className="text-xs" data-testid={`deferred-badge-${client.id}`}>
              Reporté
            </Badge>
          )}
        </div>
      ),
      sortable: true,
    },
    {
      id: 'company',
      header: 'Entreprise',
      accessorKey: 'company',
      sortable: true,
    },
    {
      id: 'type',
      header: 'Type',
      accessorKey: 'clientType',
      cell: (client) => {
        const config = clientTypeConfig[client.clientType]
        return <Badge variant={config.variant}>{config.label}</Badge>
      },
      sortable: true,
    },
    {
      id: 'status',
      header: 'Statut',
      accessorKey: 'status',
      cell: (client) => (
        <ClientStatusBadge
          status={client.status}
        />
      ),
      sortable: true,
    },
    {
      id: 'createdAt',
      header: 'Créé le',
      accessorKey: 'createdAt',
      cell: (client) => formatDate(client.createdAt),
      sortable: true,
    },
    {
      // Story 9.5c: Retention info + reactivate button for archived clients
      id: 'retention',
      header: 'Rétention',
      accessorKey: 'retentionUntil',
      cell: (client) => {
        if (client.status !== 'archived') return null
        return (
          <div className="flex items-center gap-2">
            {client.retentionUntil && (
              <span className="text-xs text-muted-foreground" data-testid={`retention-until-${client.id}`}>
                Jusqu&apos;au {formatDate(client.retentionUntil)}
              </span>
            )}
            {canReactivate(client) && (
              <ReactivateButton clientId={client.id} />
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      {showCreateButton && (
        <div className="flex justify-end gap-2">
          <ImportCsvDialog />
          <CreateClientDialog />
        </div>
      )}
      <DataTable
        data={clients}
        columns={columns}
        emptyMessage="Aucun client trouvé"
        onRowClick={onRowClick}
        pageSize={20}
        className="data-density-compact"
      />
    </div>
  )
}

ClientList.displayName = 'ClientList'

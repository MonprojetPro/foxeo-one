'use client'

import Link from 'next/link'
import { Badge, Button } from '@foxeo/ui'
import { MessageSquare } from 'lucide-react'
import type { Client } from '../types/crm.types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { CursorButton } from './cursor-button'
import { ClientStatusBadge } from './client-status-badge'
import { ClientLifecycleActions } from './client-lifecycle-actions'

interface ClientHeaderProps {
  client: Client
  onEdit?: () => void
  hideLifecycleActions?: boolean
}

const clientTypeLabels: Record<string, string> = {
  'complet': 'Complet',
  'direct_one': 'Direct One',
  'ponctuel': 'Ponctuel',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0] ?? '')
    .join('')
    .toUpperCase()
}

export function ClientHeader({ client, onEdit, hideLifecycleActions }: ClientHeaderProps) {
  const creationDate = format(new Date(client.createdAt), 'd MMMM yyyy', { locale: fr })
  const initials = getInitials(client.name)

  return (
    <div className="border-b pb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {/* Avatar initiales */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/20 text-lg font-bold text-primary">
            {initials}
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
            <p className="text-lg text-muted-foreground">{client.company}</p>
            <div className="flex gap-2">
              <Badge variant="outline">
                {clientTypeLabels[client.clientType] || client.clientType}
              </Badge>
              <ClientStatusBadge
                status={client.status}
                suspendedAt={client.suspendedAt}
                archivedAt={client.archivedAt}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Client depuis le {creationDate}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/modules/chat/${client.id}`}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Envoyer Message
            </Link>
          </Button>
          <CursorButton
            clientName={client.name}
            companyName={client.company || undefined}
          />
          {!hideLifecycleActions && <ClientLifecycleActions client={client} />}
          {onEdit && (
            <Button onClick={onEdit} variant="outline" size="sm">
              Modifier
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

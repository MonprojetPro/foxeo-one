'use client'

import { Badge, Button } from '@monprojetpro/ui'
import { CalendarDays } from 'lucide-react'
import type { Client } from '../types/crm.types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ClientStatusBadge } from './client-status-badge'

interface ClientHeaderProps {
  client: Client
  onEdit?: () => void
  labActive?: boolean
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

export function ClientHeader({ client, onEdit, labActive }: ClientHeaderProps) {
  const fullName = client.firstName ? `${client.firstName} ${client.name}` : client.name
  const creationDate = format(new Date(client.createdAt), 'd MMMM yyyy', { locale: fr })
  const initials = getInitials(fullName)

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Barre accent cyan */}
      <div className="h-[3px] bg-gradient-to-r from-primary via-primary/40 to-transparent" />

      {/* Identité */}
      <div className="flex items-start gap-5 px-6 pt-5 pb-4">
        {/* Avatar */}
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/30 text-xl font-bold text-primary shadow-[0_0_20px_hsl(var(--primary)/0.15)]">
          {initials}
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight leading-tight">{fullName}</h1>
          <p className="text-sm font-mono text-primary/70 mt-0.5">{client.company}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="outline">{clientTypeLabels[client.clientType] ?? client.clientType}</Badge>
            <ClientStatusBadge
              status={client.status}
              suspendedAt={client.suspendedAt}
              archivedAt={client.archivedAt}
            />
            {labActive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-medium text-green-400 border border-green-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                Lab actif
              </span>
            )}
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground ml-1">
              <CalendarDays className="h-3 w-3" />
              Client depuis le {creationDate}
            </span>
          </div>
        </div>

        {/* Modifier */}
        {onEdit && (
          <Button onClick={onEdit} variant="outline" size="sm" className="shrink-0 mt-1">
            Modifier
          </Button>
        )}
      </div>

    </div>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Badge, Button, Switch, showSuccess, showError } from '@monprojetpro/ui'
import { CalendarDays } from 'lucide-react'
import type { Client } from '../types/crm.types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ClientStatusBadge } from './client-status-badge'
import { toggleAccess } from '../actions/toggle-access'

interface ClientHeaderProps {
  client: Client
  onEdit?: () => void
  labActive?: boolean
  dashboardType?: string
  hasActiveParcours?: boolean
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

export function ClientHeader({ client, onEdit, labActive, dashboardType, hasActiveParcours = false }: ClientHeaderProps) {
  const fullName = client.firstName ? `${client.firstName} ${client.name}` : client.name
  const creationDate = format(new Date(client.createdAt), 'd MMMM yyyy', { locale: fr })
  const initials = getInitials(fullName)

  const [isPending, startTransition] = useTransition()
  const queryClient = useQueryClient()

  const labEnabled = dashboardType === 'lab'
  const oneEnabled = dashboardType === 'one' || dashboardType === 'lab'

  const handleToggle = (accessType: 'lab' | 'one', enabled: boolean) => {
    startTransition(async () => {
      const result = await toggleAccess({ clientId: client.id, accessType, enabled })
      if (result.error) {
        showError(result.error.message)
        return
      }
      const label = accessType === 'lab' ? 'Lab' : 'One'
      showSuccess(`Accès ${label} ${enabled ? 'activé' : 'désactivé'}`)
      await queryClient.invalidateQueries({ queryKey: ['client', client.id] })
      await queryClient.invalidateQueries({ queryKey: ['clients'] })
      await queryClient.invalidateQueries({ queryKey: ['client-parcours', client.id] })
    })
  }

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

        {/* Actions header droite */}
        <div className="flex items-center gap-4 shrink-0 mt-1">
          {/* Toggles accès compacts */}
          {dashboardType && (
            <div className="flex items-center gap-3 border border-border rounded-lg px-3 py-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Lab</span>
                <Switch
                  checked={labEnabled}
                  onCheckedChange={(checked: boolean) => handleToggle('lab', checked)}
                  disabled={isPending}
                  aria-label="Accès Lab"
                  data-testid="header-toggle-lab"
                  className="scale-75"
                />
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">One</span>
                <Switch
                  checked={oneEnabled}
                  onCheckedChange={(checked: boolean) => handleToggle('one', checked)}
                  disabled={isPending}
                  aria-label="Accès One"
                  data-testid="header-toggle-one"
                  className="scale-75"
                />
              </div>
            </div>
          )}

          {/* Modifier */}
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

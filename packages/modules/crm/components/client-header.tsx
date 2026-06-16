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
  dashboardType?: string
  /** Conservé pour compat appelant — non utilisé ici (l'activation Lab vit dans l'onglet Lab). */
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

export function ClientHeader({ client, onEdit, dashboardType }: ClientHeaderProps) {
  const fullName = client.firstName ? `${client.firstName} ${client.name}` : client.name
  const creationDate = format(new Date(client.createdAt), 'd MMMM yyyy', { locale: fr })
  const initials = getInitials(fullName)

  // Lecture seule : le header reflète l'état d'accès, il ne le pilote pas.
  // L'activation/désactivation Lab & One vit dans l'onglet Lab (section ① Activation),
  // avec son garde-fou de confirmation. Évite le doublon d'action et la divergence de comportement.
  const labEnabled = dashboardType === 'lab'
  const oneEnabled = dashboardType === 'one' || dashboardType === 'lab'

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
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground ml-1">
              <CalendarDays className="h-3 w-3" />
              Client depuis le {creationDate}
            </span>
          </div>
        </div>

        {/* Actions header droite — lecture seule, l'activation Lab/One vit dans l'onglet Lab */}
        <div className="flex items-center gap-4 shrink-0 mt-1">
          {/* Indicateurs d'accès (lecture seule) — Lab = violet, One = vert ; grisé si inactif */}
          {dashboardType && (
            <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                  labEnabled
                    ? 'bg-violet-500/15 text-violet-300 border-violet-500/30'
                    : 'bg-muted/40 text-muted-foreground border-transparent'
                }`}
                title={labEnabled ? 'Accès Lab actif' : 'Accès Lab inactif'}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${labEnabled ? 'bg-violet-400' : 'bg-muted-foreground/40'}`} />
                Lab
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                  oneEnabled
                    ? 'bg-green-500/15 text-green-400 border-green-500/30'
                    : 'bg-muted/40 text-muted-foreground border-transparent'
                }`}
                title={oneEnabled ? 'Accès One actif' : 'Accès One inactif'}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${oneEnabled ? 'bg-green-400' : 'bg-muted-foreground/40'}`} />
                One
              </span>
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

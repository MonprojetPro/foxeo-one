'use client'

import type { ReactNode } from 'react'
import { Badge, Button } from '@monprojetpro/ui'
import { CalendarDays, Mail, Phone, Briefcase, Globe } from 'lucide-react'
import type { Client } from '../types/crm.types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ClientStatusBadge } from './client-status-badge'
import { TIER_INFO, TIER_BADGE_CLASSES } from '../utils/tier-helpers'
import type { SubscriptionTier } from '../types/subscription.types'

interface ClientHeaderProps {
  client: Client
  onEdit?: () => void
  dashboardType?: string
  /** Actions additionnelles à droite (ex. bouton « Se connecter comme » — module admin, injecté par le Hub). */
  headerActionsSlot?: ReactNode
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

export function ClientHeader({ client, onEdit, dashboardType, headerActionsSlot }: ClientHeaderProps) {
  const fullName = client.firstName ? `${client.firstName} ${client.name}` : client.name
  const creationDate = format(new Date(client.createdAt), 'd MMMM yyyy', { locale: fr })
  const initials = getInitials(fullName)

  // Tier d'abonnement (rapatrié de l'ex-carte d'en-tête du cockpit).
  const tier = client.config?.subscriptionTier as SubscriptionTier | undefined
  const tierInfo = tier ? TIER_INFO[tier] : null
  const tierBadgeClass = tier ? TIER_BADGE_CLASSES[tier] : ''

  // Lecture seule : le header reflète l'état d'accès réel (vrais flags), il ne le pilote pas.
  // Lab a 3 états : agents actifs (violet) / espace présent mais agents coupés = historique
  // (grisé) / pas de Lab (pastille masquée). One = accès One ouvert (vert / grisé).
  const hasLab = client.config?.labModeAvailable ?? (dashboardType === 'lab')
  const labAgentsOn = client.config?.elioLabEnabled ?? false
  const oneEnabled = client.config?.oneModeAvailable ?? (dashboardType === 'one')
  const hasAnyAccess = hasLab || oneEnabled

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
            {tierInfo && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tierBadgeClass}`}>{tierInfo.name}</span>
            )}
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground ml-1">
              <CalendarDays className="h-3 w-3" />
              Client depuis le {creationDate}
            </span>
          </div>

          {/* Contact (rapatrié de l'ex-onglet Info) */}
          <div className="flex items-center gap-x-4 gap-y-1 mt-2 flex-wrap text-xs text-muted-foreground">
            <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 hover:text-foreground">
              <Mail className="h-3 w-3" /> {client.email}
            </a>
            {client.phone && (
              <span className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {client.phone}</span>
            )}
            {client.sector && (
              <span className="flex items-center gap-1.5"><Briefcase className="h-3 w-3" /> {client.sector}</span>
            )}
            {client.website && (
              <a href={client.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-foreground">
                <Globe className="h-3 w-3" /> {client.website}
              </a>
            )}
          </div>
        </div>

        {/* Actions header droite — lecture seule, l'activation Lab/One vit dans l'onglet Lab */}
        <div className="flex items-center gap-4 shrink-0 mt-1">
          {/* Indicateurs d'accès (lecture seule) — Lab = violet, One = vert ; grisé si inactif */}
          {hasAnyAccess && (
            <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2">
              {hasLab && (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                    labAgentsOn
                      ? 'bg-violet-500/15 text-violet-300 border-violet-500/30'
                      : 'bg-muted/40 text-muted-foreground border-transparent'
                  }`}
                  title={labAgentsOn ? 'Lab — agents actifs' : 'Lab — historique (agents coupés)'}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${labAgentsOn ? 'bg-violet-400' : 'bg-muted-foreground/40'}`} />
                  {labAgentsOn ? 'Lab' : 'Lab · historique'}
                </span>
              )}
              {oneEnabled && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border bg-green-500/15 text-green-400 border-green-500/30"
                  title="Accès One ouvert"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                  One
                </span>
              )}
            </div>
          )}

          {/* Action injectée par le Hub (ex. « Se connecter comme ») */}
          {headerActionsSlot}

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

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
import { useClientTabNav } from '../hooks/use-client-tab-nav'
import { isCancelledSubscription } from '../types/crm.types'

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
  const { navigateToTab } = useClientTabNav()
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
  // Client résilié/transféré (isFrozen) : le parcours est figé quels que soient les flags
  // bruts en base — les pastilles ne doivent jamais dire « actif » dans ce cas.
  const isFrozen = isCancelledSubscription(client.status)
  const hasLab = client.config?.labModeAvailable ?? (dashboardType === 'lab')
  const labAgentsOn = client.config?.elioLabEnabled ?? false
  const oneEnabled = client.config?.oneModeAvailable ?? (dashboardType === 'one')
  const hasAnyAccess = hasLab || oneEnabled

  return (
    /* En-tête fiche client — cockpit sombre avec barre accent cyan */
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
      {/* Barre accent cyan en haut */}
      <div className="h-[3px] bg-gradient-to-r from-cyan-400 via-cyan-400/40 to-transparent" />

      {/* Zone identité */}
      <div className="flex items-start gap-5 px-6 pt-5 pb-4">
        {/* Avatar initiales — pastille cockpit cyan */}
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 border border-cyan-400/30 text-xl font-bold text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.15)]">
          {initials}
        </div>

        {/* Infos identité */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight leading-tight text-white">{fullName}</h1>
          <p className="text-sm font-mono text-cyan-300/70 mt-0.5">{client.company}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="outline" className="border-white/15 bg-white/[0.04] text-gray-300">
              {clientTypeLabels[client.clientType] ?? client.clientType}
            </Badge>
            <ClientStatusBadge
              status={client.status}
              suspendedAt={client.suspendedAt}
              archivedAt={client.archivedAt}
            />
            {tierInfo && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tierBadgeClass}`}>{tierInfo.name}</span>
            )}
            <span className="flex items-center gap-1.5 text-xs text-gray-500 ml-1">
              <CalendarDays className="h-3 w-3" />
              Client depuis le {creationDate}
            </span>
          </div>

          {/* Infos de contact — secondaires */}
          <div className="flex items-center gap-x-4 gap-y-1 mt-2 flex-wrap text-xs text-gray-400">
            <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Mail className="h-3 w-3" /> {client.email}
            </a>
            {client.phone && (
              <span className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {client.phone}</span>
            )}
            {client.sector && (
              <span className="flex items-center gap-1.5"><Briefcase className="h-3 w-3" /> {client.sector}</span>
            )}
            {client.website && (
              <a href={client.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-white transition-colors">
                <Globe className="h-3 w-3" /> {client.website}
              </a>
            )}
          </div>
        </div>

        {/* Zone droite — indicateurs d'accès + actions */}
        <div className="flex items-center gap-4 shrink-0 mt-1">
          {/* Pastilles d'accès Lab/One (lecture seule) — Lab = violet, One = vert ; grisé si inactif */}
          {hasAnyAccess && (
            <div className="flex items-center gap-2 border border-white/10 rounded-xl px-3 py-2">
              {hasLab && (
                /* Cliquable : ouvre l'onglet Lab, là où vit le levier « Agents du parcours ».
                   Client figé : jamais violet « actif », même si elio_lab_enabled est encore vrai
                   en base — le parcours est arrêté par la résiliation, pas par ce flag. */
                <button
                  type="button"
                  onClick={() => navigateToTab('lab-billing')}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors cursor-pointer ${
                    isFrozen
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                      : labAgentsOn
                        ? 'bg-violet-500/15 text-violet-300 border-violet-500/30 hover:bg-violet-500/25'
                        : 'bg-white/[0.03] text-gray-500 border-white/10 hover:bg-white/[0.08] hover:text-gray-300'
                  }`}
                  title={`${
                    isFrozen
                      ? 'Lab — parcours figé (abonnement résilié, historique consultable)'
                      : labAgentsOn
                        ? 'Lab — agents actifs'
                        : 'Lab — agents en pause (historique consultable)'
                  } · cliquer pour gérer`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${isFrozen ? 'bg-amber-400' : labAgentsOn ? 'bg-violet-400' : 'bg-gray-600'}`} />
                  {isFrozen ? 'Lab · figé' : labAgentsOn ? 'Lab · agents actifs' : 'Lab · en pause'}
                </button>
              )}
              {oneEnabled && (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                    isFrozen
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : 'bg-green-500/15 text-green-400 border-green-500/30'
                  }`}
                  title={isFrozen ? 'Accès One figé (abonnement résilié, historique consultable)' : 'Accès One ouvert'}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${isFrozen ? 'bg-amber-400' : 'bg-green-400'}`} />
                  {isFrozen ? 'One · figé' : 'One'}
                </span>
              )}
            </div>
          )}

          {/* Action injectée par le Hub (ex. « Se connecter comme ») */}
          {headerActionsSlot}

          {/* Bouton modifier */}
          {onEdit && (
            <Button onClick={onEdit} variant="outline" size="sm"
              className="border-white/15 text-gray-300 hover:bg-white/[0.05]">
              Modifier
            </Button>
          )}
        </div>
      </div>

    </div>
  )
}

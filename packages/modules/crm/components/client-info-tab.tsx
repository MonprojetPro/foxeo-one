'use client'

import { Card, CardContent, CardHeader, CardTitle, Badge, Separator, Skeleton } from '@monprojetpro/ui'
import { useClient } from '../hooks/use-client'
import { useClientParcours } from '../hooks/use-client-parcours'
import { ParcoursStatusBadge } from './parcours-status-badge'
import { ClientNotesSection } from './client-notes-section'
import { TIER_INFO, TIER_BADGE_CLASSES } from '../utils/tier-helpers'
import type { SubscriptionTier } from '../types/subscription.types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { FlaskConical, Zap, Settings, Mail, Globe, Phone, Building2, Briefcase } from 'lucide-react'

interface ClientInfoTabProps {
  clientId: string
  onEdit?: () => void
}

const statusLabels: Record<string, string> = {
  'active': 'Actif',
  'suspended': 'Suspendu',
  'archived': 'Archivé',
  'subscription_cancelled': 'Résilié',
  'handed_off': 'Transféré',
  'archived_lab': 'Archivé Lab',
  'prospect': 'Prospect',
}

export function ClientInfoTab({ clientId }: ClientInfoTabProps) {
  const { data: client, isPending, error } = useClient(clientId)
  const { data: parcours } = useClientParcours(clientId)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const navigateToTab = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.push(`${pathname}?${params.toString()}`)
  }

  if (isPending) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error || !client) {
    return <div className="p-4">Erreur de chargement</div>
  }

  const isLabClient = client.config?.dashboardType === 'lab'
  const isOneClient = client.config?.dashboardType === 'one'
  const lastUpdate = format(new Date(client.updatedAt), 'd MMMM yyyy à HH:mm', { locale: fr })

  // Parcours progress
  const activeStages = parcours?.activeStages.filter((s) => s.active) ?? []
  const completedStages = activeStages.filter((s) => s.status === 'completed')
  const progressPct = activeStages.length > 0
    ? Math.round((completedStages.length / activeStages.length) * 100)
    : 0

  // Tier info
  const currentTier: SubscriptionTier = (client.config?.subscriptionTier as SubscriptionTier) ?? 'base'
  const tierInfo = TIER_INFO[currentTier]
  const tierBadgeClass = TIER_BADGE_CLASSES[currentTier]

  return (
    <div className="space-y-4 mt-6">
      {/* Grille résumé */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* Coordonnées */}
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm truncate">{client.email}</span>
            </div>
            {client.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm">{client.phone}</span>
              </div>
            )}
            {client.sector && (
              <div className="flex items-center gap-2">
                <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm">{client.sector}</span>
              </div>
            )}
            {client.website && (
              <div className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate">
                  {client.website}
                </a>
              </div>
            )}
            <Separator />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Dernière activité</span>
              <span>{lastUpdate}</span>
            </div>
          </CardContent>
        </Card>

        {/* Parcours Lab — résumé compact avec lien (visible tant qu'un parcours existe) */}
        {parcours && (
          <Card
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => navigateToTab('lab-billing')}
          >
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Parcours Lab</CardTitle>
              <FlaskConical className="h-4 w-4 text-cyan-400" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ParcoursStatusBadge status={parcours.status} />
                  {!isLabClient && (
                    <Badge variant="outline" className="text-xs text-orange-400 border-orange-400/30">
                      Lab désactivé
                    </Badge>
                  )}
                </div>
                <span className="text-sm font-medium">
                  {completedStages.length}/{activeStages.length}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-cyan-400 transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {progressPct}% complété — cliquer pour détails
              </p>
            </CardContent>
          </Card>
        )}

        {/* Abonnement One — résumé compact */}
        {isOneClient && client.config && (
          <Card
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => navigateToTab('modules')}
          >
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Abonnement One</CardTitle>
              <Zap className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tier</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tierBadgeClass}`}>
                  {tierInfo.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Mensuel</span>
                <span className="text-sm font-medium">{tierInfo.price}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modules actifs — résumé compact */}
        {client.config && client.config.activeModules.length > 0 && (
          <Card
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => navigateToTab('modules')}
          >
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Modules actifs</CardTitle>
              <Building2 className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {client.config.activeModules.slice(0, 6).map((mod) => (
                  <Badge key={mod} variant="secondary" className="text-xs">{mod}</Badge>
                ))}
                {client.config.activeModules.length > 6 && (
                  <Badge variant="outline" className="text-xs">
                    +{client.config.activeModules.length - 6}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statut — résumé compact */}
        <Card
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => navigateToTab('administration')}
        >
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Administration</CardTitle>
            <Settings className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Statut</span>
              <Badge variant="outline" className="text-xs">
                {statusLabels[client.status] || client.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Dashboard</span>
              <span className="text-sm font-medium capitalize">{client.config?.dashboardType ?? '—'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes privées — reste sur la page Info */}
      <ClientNotesSection clientId={clientId} />
    </div>
  )
}

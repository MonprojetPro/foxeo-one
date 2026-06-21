'use client'

import { useState } from 'react'
import {
  Card, CardContent, CardHeader, CardTitle, Badge, Button,
} from '@monprojetpro/ui'
import {
  AlertCircle, CheckCircle2, TrendingUp, Activity, Zap, GraduationCap,
  ArrowRight, CircleSlash, CreditCard, FlaskConical, ExternalLink,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useClient } from '../hooks/use-client'
import { useClientParcours } from '../hooks/use-client-parcours'
import { useClientPendingValidations } from '../hooks/use-client-pending-validations'
import { useClientActivitySnapshot } from '../hooks/use-client-activity-snapshot'
import { useClientInstance } from '../hooks/use-client-instance'
import { useClientTabNav } from '../hooks/use-client-tab-nav'
import { useClientCockpitRealtime } from '../hooks/use-client-cockpit-realtime'
import { AccessToggles } from './access-toggles'
import { ParcoursModeSelector } from './parcours-mode-selector'
import { ParcoursStatusBadge } from './parcours-status-badge'
import { GraduationDialog } from './graduation-dialog'
import { ClientNotesSection } from './client-notes-section'
import { TIER_INFO, TIER_BADGE_CLASSES } from '../utils/tier-helpers'
import type { SubscriptionTier } from '../types/subscription.types'

interface ClientCockpitTabProps {
  clientId: string
  /** Tickets support ouverts — passé par le parent Hub (module support, pas d'import cross-module). */
  supportOpenCount?: number
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return '—'
  return format(new Date(value), 'd MMM yyyy', { locale: fr })
}

/** Petit bouton-icône de raccourci vers un autre onglet, posé dans l'en-tête d'une carte. */
function TabShortcut({ onClick, title }: { onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <ExternalLink className="h-4 w-4" />
    </button>
  )
}

/** Ligne « à traiter » : compteur + raccourci vers l'onglet dédié. */
function TodoRow({
  count, label, onClick,
}: { count: number; label: string; onClick: () => void }) {
  if (count <= 0) return null
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-left transition-colors hover:bg-amber-500/20"
    >
      <span className="flex items-center gap-2 text-sm font-medium text-amber-200">
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500/30 px-1.5 text-xs font-bold">
          {count}
        </span>
        {label}
      </span>
      <ArrowRight className="h-4 w-4 text-amber-300/70" />
    </button>
  )
}

export function ClientCockpitTab({ clientId, supportOpenCount }: ClientCockpitTabProps) {
  const { data: client } = useClient(clientId)
  const { data: parcours } = useClientParcours(clientId)
  const { data: pendingValidations } = useClientPendingValidations(clientId)
  const { data: activity } = useClientActivitySnapshot(clientId)
  const { data: instance } = useClientInstance(clientId)
  const { navigateToTab } = useClientTabNav('pilote')

  // Rafraîchissement live (soumission / validation / progression) via broadcast DB.
  useClientCockpitRealtime(clientId)

  const [graduationOpen, setGraduationOpen] = useState(false)

  if (!client) {
    return <div className="h-64 rounded-xl bg-muted animate-pulse" />
  }

  const dashboardType = client.config?.dashboardType ?? 'lab'
  const isLabClient = dashboardType === 'lab'
  const isOneClient = dashboardType === 'one'
  const hasGraduated = !!client.config?.graduationSource
  const hasActiveParcours = parcours?.status === 'en_cours'
  const parcoursAbandoned = parcours?.status === 'abandoned'

  // ── Progression (B) ──
  const activeStages = parcours?.activeStages.filter((s) => s.active) ?? []
  const completedStages = activeStages.filter((s) => s.status === 'completed')
  const progressPct = activeStages.length > 0
    ? Math.round((completedStages.length / activeStages.length) * 100)
    : 0
  // « Étape en cours » = l'étape en cours, sinon la prochaine en attente (jamais une skipped/terminée).
  const currentStage =
    activeStages.find((s) => s.status === 'in_progress') ??
    activeStages.find((s) => s.status === 'pending')
  const currentStageLabel = currentStage
    ? (currentStage.label ?? `Étape ${activeStages.indexOf(currentStage) + 1} sur ${activeStages.length}`)
    : null

  // ── À traiter (C) ──
  const pendingCount = pendingValidations?.count ?? 0
  const abandonCount = parcoursAbandoned ? 1 : 0
  const supportCount = supportOpenCount ?? 0
  const totalTodo = pendingCount + abandonCount + supportCount

  // ── Abonnement (clients One gradués / direct_one) ──
  const currentTier: SubscriptionTier = (client.config?.subscriptionTier as SubscriptionTier) ?? 'base'
  const tierInfo = TIER_INFO[currentTier]
  const tierBadgeClass = TIER_BADGE_CLASSES[currentTier]
  const showAbonnement = isOneClient && (hasGraduated || client.clientType === 'direct_one')

  const canGraduate = isLabClient && !!parcours

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* ──────────── C — À traiter maintenant ──────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="h-4 w-4 text-amber-400" />
            À traiter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {totalTodo === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              Rien à traiter pour ce client.
            </div>
          ) : (
            <>
              <TodoRow count={pendingCount} label="Validation(s) en attente" onClick={() => navigateToTab('submissions')} />
              <TodoRow count={abandonCount} label="Demande d'abandon de parcours" onClick={() => navigateToTab('lab-billing')} />
              <TodoRow count={supportCount} label="Ticket(s) support ouvert(s)" onClick={() => navigateToTab('support')} />
            </>
          )}
        </CardContent>
      </Card>

      {/* ──────────── B — Progression parcours ──────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-2 text-base">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-cyan-400" />
              Progression
            </span>
            <span className="flex items-center gap-2">
              {parcours && <ParcoursStatusBadge status={parcours.status} />}
              <TabShortcut onClick={() => navigateToTab('lab-billing')} title="Ouvrir l'onglet Lab" />
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {parcours ? (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Étapes terminées</span>
                <span className="font-medium">{completedStages.length} / {activeStages.length} ({progressPct}%)</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-cyan-500 transition-all" style={{ width: `${progressPct}%` }} />
              </div>
              {currentStageLabel && (
                <p className="text-xs text-muted-foreground">
                  Étape en cours : <span className="font-medium text-foreground">{currentStageLabel}</span>
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun parcours assigné.</p>
          )}
        </CardContent>
      </Card>

      {/* ──────────── D — Activité & alertes ──────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-violet-400" />
            Activité
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Première connexion</span>
            <span className="font-medium">
              {activity?.firstLoginAt ? fmtDate(activity.firstLoginAt) : 'Jamais connecté'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Dernière activité</span>
            <span className="font-medium">{fmtDate(activity?.lastActivityAt)}</span>
          </div>
          {activity?.isInactive && (
            <div className="flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-xs text-orange-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Inactif depuis {activity.daysSinceActivity} jours — relance Concierge automatique active.
            </div>
          )}
        </CardContent>
      </Card>

      {/* ──────────── F — Instance One (+ graduation) ──────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-2 text-base">
            <span className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-400" />
              Instance One
            </span>
            {instance && <TabShortcut onClick={() => navigateToTab('modules')} title="Ouvrir l'onglet One" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {instance ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Statut</span>
                <Badge variant={instance.status === 'active' ? 'default' : 'outline'} className="capitalize">
                  {instance.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Modules actifs</span>
                <span className="font-medium">{instance.activeModules.length}</span>
              </div>
            </>
          ) : (
            <p className="flex items-center gap-2 text-muted-foreground">
              <CircleSlash className="h-4 w-4" />
              Pas encore d'instance One.
            </p>
          )}

          {/* Graduation Lab → One (l'action qui crée le One) */}
          {canGraduate && (
            <Button
              size="sm"
              className="w-full"
              onClick={() => setGraduationOpen(true)}
              data-testid="cockpit-graduate-button"
            >
              <GraduationCap className="mr-1.5 h-4 w-4" /> Graduer vers One
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ──────────── Abonnement (clients One gradués / direct_one) ──────────── */}
      {showAbonnement && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4 text-blue-400" />
              Abonnement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Tier</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tierBadgeClass}`}>{tierInfo.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Mensuel</span>
              <span className="font-medium">{tierInfo.price}</span>
            </div>
            <Button variant="ghost" size="sm" className="px-0 text-blue-300" onClick={() => navigateToTab('administration')}>
              Gérer l'abonnement <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ──────────── Mode du parcours (tracé / libre) — pour tout client ayant un espace Lab.
           Visible même avant le lancement, pour que MiKL puisse pré-régler le mode. ──────────── */}
      {client.config?.labModeAvailable && (
        <div className="lg:col-span-2">
          <ParcoursModeSelector
            clientId={clientId}
            mode={client.config?.parcoursMode ?? 'tracee'}
          />
        </div>
      )}

      {/* ──────────── E — Accès (toggles inline, pleine largeur) ──────────── */}
      <div className="lg:col-span-2">
        <AccessToggles
          clientId={clientId}
          labModeAvailable={client.config?.labModeAvailable ?? false}
          elioLabEnabled={client.config?.elioLabEnabled ?? false}
          oneModeAvailable={client.config?.oneModeAvailable ?? false}
          hasActiveParcours={hasActiveParcours}
        />
      </div>

      {/* ──────────── Notes privées (pleine largeur) ──────────── */}
      <div className="lg:col-span-2">
        <ClientNotesSection clientId={clientId} />
      </div>

      {/* Dialog graduation */}
      {isLabClient && parcours && (
        <GraduationDialog
          clientId={clientId}
          clientName={client.name}
          clientCompany={client.company ?? ''}
          parcours={parcours}
          open={graduationOpen}
          onOpenChange={setGraduationOpen}
        />
      )}
    </div>
  )
}

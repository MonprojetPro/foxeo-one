'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Button,
  Badge,
  CockpitPanel,
  CockpitCallout,
  StatCard,
  SectionTitle,
  BlockSkeleton,
  RowSkeleton,
} from '@monprojetpro/ui'
import {
  AlertCircle, CheckCircle2, TrendingUp, Activity, Zap, GraduationCap,
  ArrowRight, CircleSlash, CreditCard, FlaskConical, ExternalLink, Rss,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useClient } from '../hooks/use-client'
import { useClientParcours } from '../hooks/use-client-parcours'
import { useClientPendingValidations } from '../hooks/use-client-pending-validations'
import { useClientActivitySnapshot } from '../hooks/use-client-activity-snapshot'
import { useClientInstance } from '../hooks/use-client-instance'
import { useClientTabNav } from '../hooks/use-client-tab-nav'
import { useClientCockpitRealtime } from '../hooks/use-client-cockpit-realtime'
import { useClientToolTrackingSummary } from '../hooks/use-client-tool-tracking-summary'
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

/** Petit bouton-icône de raccourci vers un autre onglet, posé dans l'en-tête d'un panneau. */
function TabShortcut({ onClick, title }: { onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="rounded-md p-1 text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-300"
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
      className="flex w-full items-center justify-between rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-3 py-2.5 text-left transition-colors hover:bg-amber-400/10"
    >
      <span className="flex items-center gap-2 text-sm font-medium text-amber-200">
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400/20 px-1.5 text-xs font-bold ring-1 ring-amber-400/30">
          {count}
        </span>
        {label}
      </span>
      <ArrowRight className="h-4 w-4 text-amber-300/60" />
    </button>
  )
}

export function ClientCockpitTab({ clientId, supportOpenCount }: ClientCockpitTabProps) {
  const router = useRouter()
  const { data: client } = useClient(clientId)
  const { data: parcours } = useClientParcours(clientId)
  const { data: pendingValidations } = useClientPendingValidations(clientId)
  const { data: activity } = useClientActivitySnapshot(clientId)
  const { data: instance } = useClientInstance(clientId)
  const { data: toolSummary, isLoading: toolSummaryLoading } = useClientToolTrackingSummary(clientId)
  const { navigateToTab } = useClientTabNav('pilote')

  // Rafraichissement live (soumission / validation / progression) via broadcast DB.
  useClientCockpitRealtime(clientId)

  const [graduationOpen, setGraduationOpen] = useState(false)

  if (!client) {
    return <BlockSkeleton className="h-64" />
  }

  const dashboardType = client.config?.dashboardType ?? 'lab'
  const isLabClient = dashboardType === 'lab'
  const isOneClient = dashboardType === 'one'
  const hasGraduated = !!client.config?.graduationSource
  const hasActiveParcours = parcours?.status === 'en_cours'
  const parcoursAbandoned = parcours?.status === 'abandoned'

  // Progression (B)
  const activeStages = parcours?.activeStages.filter((s) => s.active) ?? []
  const completedStages = activeStages.filter((s) => s.status === 'completed')
  const progressPct = activeStages.length > 0
    ? Math.round((completedStages.length / activeStages.length) * 100)
    : 0
  // Etape en cours = l'etape en cours, sinon la prochaine en attente (jamais une skipped/terminee).
  const currentStage =
    activeStages.find((s) => s.status === 'in_progress') ??
    activeStages.find((s) => s.status === 'pending')
  const currentStageLabel = currentStage
    ? (currentStage.label ?? `Etape ${activeStages.indexOf(currentStage) + 1} sur ${activeStages.length}`)
    : null

  // A traiter (C)
  const pendingCount = pendingValidations?.count ?? 0
  const abandonCount = parcoursAbandoned ? 1 : 0
  const supportCount = supportOpenCount ?? 0
  const totalTodo = pendingCount + abandonCount + supportCount

  // Abonnement (clients One gradues / direct_one)
  const currentTier: SubscriptionTier = (client.config?.subscriptionTier as SubscriptionTier) ?? 'base'
  const tierInfo = TIER_INFO[currentTier]
  const tierBadgeClass = TIER_BADGE_CLASSES[currentTier]
  const showAbonnement = isOneClient && (hasGraduated || client.clientType === 'direct_one')

  const canGraduate = isLabClient && !!parcours

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* C — A traiter maintenant */}
      <CockpitPanel
        title="A traiter"
        badge={totalTodo > 0 ? totalTodo : undefined}
        badgeTone="amber"
      >
        <div className="space-y-1.5 p-2">
          {totalTodo === 0 ? (
            <CockpitCallout tone="emerald" icon={CheckCircle2}>
              Rien à traiter pour ce client.
            </CockpitCallout>
          ) : (
            <>
              <TodoRow count={pendingCount} label="Validation(s) en attente" onClick={() => navigateToTab('submissions')} />
              <TodoRow count={abandonCount} label="Demande d'abandon de parcours" onClick={() => navigateToTab('lab-billing')} />
              <TodoRow count={supportCount} label="Ticket(s) support ouvert(s)" onClick={() => navigateToTab('support')} />
            </>
          )}
        </div>
      </CockpitPanel>

      {/* B — Progression parcours */}
      <CockpitPanel
        title="Progression"
        linkHref={undefined}
        linkText={undefined}
      >
        <div className="p-2">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-cyan-400" />
              {parcours && <ParcoursStatusBadge status={parcours.status} />}
            </div>
            <TabShortcut onClick={() => navigateToTab('lab-billing')} title="Ouvrir l'onglet Lab" />
          </div>
          {parcours ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Etapes terminees</span>
                <span className="font-medium text-white tabular-nums">
                  {completedStages.length} / {activeStages.length} ({progressPct}%)
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-cyan-500 transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              {currentStageLabel && (
                <p className="text-xs text-gray-500">
                  Etape en cours :{' '}
                  <span className="font-medium text-gray-300">{currentStageLabel}</span>
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Aucun parcours assigné.</p>
          )}
        </div>
      </CockpitPanel>

      {/* D — Activite & alertes */}
      <CockpitPanel title="Activite">
        <div className="space-y-1.5 p-2">
          <div className="flex items-center gap-2 px-1 pb-1">
            <Activity className="h-4 w-4 text-violet-400" />
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500">Connexions</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <StatCard
              label="Premiere connexion"
              value={activity?.firstLoginAt ? fmtDate(activity.firstLoginAt) : 'Jamais'}
            />
            <StatCard
              label="Derniere activite"
              value={fmtDate(activity?.lastActivityAt)}
            />
          </div>
          {activity?.isInactive && (
            <CockpitCallout tone="amber" icon={AlertCircle} className="mt-2">
              Inactif depuis {activity.daysSinceActivity} jours — relance Concierge automatique active.
            </CockpitCallout>
          )}
        </div>
      </CockpitPanel>

      {/* G — Suivi de l'outil */}
      <CockpitPanel title="Suivi de l'outil">
        <div className="space-y-2 p-2">
          <div className="flex items-center gap-2 px-1 pb-1">
            <Rss className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500">Publications</span>
          </div>
          {toolSummaryLoading ? (
            <div className="space-y-2">
              <RowSkeleton />
              <RowSkeleton className="w-2/3" />
            </div>
          ) : toolSummary && toolSummary.postCount > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              <StatCard
                label="Publications"
                value={toolSummary.postCount}
                accent
                tone="emerald"
              />
              <StatCard
                label="Reactions client"
                value={toolSummary.clientCommentCount}
              />
              <div className="col-span-2 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
                <span className="text-[0.7rem] font-medium uppercase tracking-wider text-gray-500">Derniere activite</span>
                <span className="text-sm font-medium text-white">
                  {toolSummary.lastActivityAt
                    ? formatDistanceToNow(new Date(toolSummary.lastActivityAt), { addSuffix: true, locale: fr })
                    : '—'}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-gray-500">
              <CircleSlash className="h-4 w-4 shrink-0" />
              Aucune publication pour l'instant.
            </div>
          )}
          <Button
            size="sm"
            variant="outline"
            className="mt-1 w-full border-white/10 text-gray-300 hover:bg-white/5"
            onClick={() => router.push(`/modules/suivi-outil/${clientId}`)}
            data-testid="cockpit-open-suivi-outil"
          >
            Ouvrir le suivi
            <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>
      </CockpitPanel>

      {/* F — Instance One (+ graduation) */}
      <CockpitPanel title="Instance One">
        <div className="space-y-2 p-2">
          <div className="mb-1 flex items-center justify-between">
            <div className="flex items-center gap-2 px-1">
              <Zap className="h-4 w-4 text-blue-400" />
              <span className="text-xs font-medium uppercase tracking-wider text-gray-500">Statut</span>
            </div>
            {instance && (
              <TabShortcut onClick={() => navigateToTab('modules')} title="Ouvrir l'onglet One" />
            )}
          </div>
          {instance ? (
            <div className="grid grid-cols-2 gap-2">
              <StatCard
                label="Statut"
                value={instance.status === 'active' ? 'Actif' : instance.status}
                accent={instance.status === 'active'}
                tone="cyan"
              />
              <StatCard
                label="Modules actifs"
                value={instance.activeModules.length}
                accent
                tone="blue"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-gray-500">
              <CircleSlash className="h-4 w-4 shrink-0" />
              Pas encore d'instance One.
            </div>
          )}

          {/* Graduation Lab → One */}
          {canGraduate && (
            <Button
              size="sm"
              className="mt-1 w-full"
              onClick={() => setGraduationOpen(true)}
              data-testid="cockpit-graduate-button"
            >
              <GraduationCap className="mr-1.5 h-4 w-4" /> Graduer vers One
            </Button>
          )}
        </div>
      </CockpitPanel>

      {/* Abonnement (clients One gradues / direct_one) */}
      {showAbonnement && (
        <CockpitPanel title="Abonnement">
          <div className="space-y-2 p-2">
            <div className="flex items-center gap-2 px-1 pb-1">
              <CreditCard className="h-4 w-4 text-blue-400" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="Tier" value={tierInfo.name} />
              <StatCard label="Mensuel" value={tierInfo.price} accent tone="blue" />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="px-0 text-blue-300 hover:text-blue-200"
              onClick={() => navigateToTab('administration')}
            >
              Gerer l'abonnement <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </CockpitPanel>
      )}

      {/* Mode du parcours (trace / libre) — pour tout client ayant un espace Lab.
          Visible meme avant le lancement, pour que MiKL puisse pre-regler le mode. */}
      {client.config?.labModeAvailable && (
        <div className="lg:col-span-2">
          <ParcoursModeSelector
            clientId={clientId}
            mode={client.config?.parcoursMode ?? 'tracee'}
          />
        </div>
      )}

      {/* E — Acces (toggles inline, pleine largeur) */}
      <div className="lg:col-span-2">
        <AccessToggles
          clientId={clientId}
          labModeAvailable={client.config?.labModeAvailable ?? false}
          elioLabEnabled={client.config?.elioLabEnabled ?? false}
          oneModeAvailable={client.config?.oneModeAvailable ?? false}
          hasActiveParcours={hasActiveParcours}
        />
      </div>

      {/* Notes privees (pleine largeur) */}
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

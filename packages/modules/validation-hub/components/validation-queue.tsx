'use client'

import { useRouter } from 'next/navigation'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  CockpitHeader,
  CockpitCallout,
  PillTabs,
  CountBadge,
} from '@monprojetpro/ui'
import { cn, formatRelativeDate } from '@monprojetpro/utils'
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  PauseCircle,
  ShieldCheck,
  Clock3,
  CheckCheck,
  XCircle,
  HelpCircle,
  ArrowDownUp,
  Layers,
} from 'lucide-react'
import { useValidationQueue } from '../hooks/use-validation-queue'
import { useValidationRealtime } from '../hooks/use-validation-realtime'
import type {
  ValidationRequest,
  ValidationRequestStatus,
  ValidationRequestType,
  ValidationQueueFilters,
} from '../types/validation.types'

// ── Config visuelle des statuts ──────────────────────────────────────────────

const STATUS_CONFIG: Record<
  ValidationRequestStatus,
  { label: string; className: string }
> = {
  pending: {
    label: 'En attente',
    className: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  approved: {
    label: 'Approuvé',
    className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  rejected: {
    label: 'Refusé',
    className: 'bg-red-500/20 text-red-300 border-red-500/30',
  },
  needs_clarification: {
    label: 'Précisions demandées',
    className: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  },
}

// Config visuelle des types de demande
const TYPE_CONFIG: Record<
  ValidationRequestType,
  { label: string; className: string }
> = {
  brief_lab: {
    label: 'Brief Lab',
    className: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  },
  evolution_one: {
    label: 'Évolution One',
    className: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  },
  step_submission: {
    label: 'Soumission étape',
    className: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  },
}

// ── Skeleton cockpit d'une carte demande ─────────────────────────────────────

function ValidationCardSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 animate-pulse">
      {/* Avatar */}
      <div className="h-10 w-10 shrink-0 rounded-full bg-white/5" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="h-4 w-32 rounded bg-white/5" />
          <div className="h-5 w-20 rounded-full bg-white/5" />
        </div>
        <div className="h-4 w-56 rounded bg-white/5" />
        <div className="flex items-center gap-2">
          <div className="h-5 w-24 rounded-full bg-white/5" />
          <div className="h-4 w-14 rounded bg-white/5" />
        </div>
      </div>
    </div>
  )
}

// ── État vide — file d'attente vide ──────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-16 text-center">
      {/* Pastille d'icône */}
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-400/10">
        <CheckCircle2 className="h-7 w-7 text-emerald-300" />
      </div>
      <div>
        <p className="text-base font-medium text-white">
          Aucune demande en attente — tout est à jour !
        </p>
        <p className="mt-1 text-sm text-gray-400">
          Toutes les demandes ont été traitées.
        </p>
      </div>
    </div>
  )
}

// ── Carte individuelle d'une demande de validation ───────────────────────────

function ValidationCard({
  request,
  onClick,
}: {
  request: ValidationRequest
  onClick: () => void
}) {
  const statusConfig = STATUS_CONFIG[request.status]
  const typeConfig = TYPE_CONFIG[request.type]
  const isPostponed =
    request.status === 'pending' &&
    (request.reviewerComment?.startsWith('Reporté') ?? false)
  const initials =
    request.client?.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) ?? '??'

  return (
    <div
      className="group cursor-pointer rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition-all duration-200 hover:border-cyan-400/30 hover:bg-white/[0.04]"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <div className="flex items-start gap-3">
        {/* Avatar client */}
        <Avatar className="h-10 w-10 shrink-0">
          {request.client?.avatarUrl && (
            <AvatarImage
              src={request.client.avatarUrl}
              alt={request.client.name}
            />
          )}
          <AvatarFallback className="bg-cyan-400/10 text-cyan-300 text-xs font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          {/* Nom + badge statut */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="block truncate text-sm font-medium text-white">
                {request.client?.name ?? 'Client inconnu'}
              </span>
              {request.client?.company && (
                <span className="block truncate text-xs text-gray-500">
                  {request.client.company}
                </span>
              )}
            </div>
            <Badge
              variant="outline"
              className={cn('shrink-0 border text-xs', statusConfig.className)}
            >
              {statusConfig.label}
            </Badge>
          </div>

          {/* Titre de la demande */}
          <p className="mt-1.5 line-clamp-2 text-sm text-gray-300">
            {request.title}
          </p>

          {/* Badges type + reportée + horodatage */}
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            <Badge
              variant="outline"
              className={cn('border text-xs', typeConfig.className)}
            >
              {typeConfig.label}
            </Badge>
            {isPostponed && (
              <Badge
                variant="outline"
                className="border border-orange-500/30 bg-orange-500/10 text-xs text-orange-300"
              >
                <PauseCircle className="mr-1 h-3 w-3" />
                Reportée
              </Badge>
            )}
            <span className="flex items-center gap-1 text-xs text-gray-500 tabular-nums">
              <Clock className="h-3 w-3" />
              {formatRelativeDate(request.submittedAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Barre de filtres en pills ─────────────────────────────────────────────────

type StatusFilter = ValidationQueueFilters['status']
type TypeFilter = ValidationQueueFilters['type']
type SortFilter = `${ValidationQueueFilters['sortBy']}|${ValidationQueueFilters['sortOrder']}`

function FilterBar({
  filters,
  setFilters,
}: {
  filters: ValidationQueueFilters
  setFilters: (f: Partial<ValidationQueueFilters>) => void
}) {
  // Pills statut
  const statusTabs = [
    { key: 'all' as StatusFilter, label: 'Tous', icon: Layers },
    { key: 'pending' as StatusFilter, label: 'En attente', icon: Clock3 },
    { key: 'approved' as StatusFilter, label: 'Approuvés', icon: CheckCheck },
    { key: 'rejected' as StatusFilter, label: 'Refusés', icon: XCircle },
    { key: 'needs_clarification' as StatusFilter, label: 'Précisions', icon: HelpCircle },
  ]

  // Pills type
  const typeTabs = [
    { key: 'all' as TypeFilter, label: 'Tous types' },
    { key: 'brief_lab' as TypeFilter, label: 'Brief Lab' },
    { key: 'evolution_one' as TypeFilter, label: 'Évolution One' },
    { key: 'step_submission' as TypeFilter, label: 'Soumission étape' },
  ]

  // Pills tri
  const sortTabs = [
    { key: 'submitted_at|asc' as SortFilter, label: 'Plus ancienne', icon: ArrowDownUp },
    { key: 'submitted_at|desc' as SortFilter, label: 'Plus récente', icon: ArrowDownUp },
  ]

  const currentSort: SortFilter = `${filters.sortBy}|${filters.sortOrder}`

  return (
    <div className="flex flex-col gap-3">
      {/* Ligne 1 : filtre statut */}
      <PillTabs
        tabs={statusTabs}
        active={filters.status}
        onChange={(key) => setFilters({ status: key })}
        tone="cyan"
      />
      {/* Ligne 2 : filtre type + tri */}
      <div className="flex flex-wrap items-center gap-2">
        <PillTabs
          tabs={typeTabs}
          active={filters.type}
          onChange={(key) => setFilters({ type: key })}
          tone="gray"
        />
        <span className="mx-1 h-4 w-px bg-white/10" aria-hidden />
        <PillTabs
          tabs={sortTabs}
          active={currentSort}
          onChange={(key) => {
            const [sortBy, sortOrder] = key.split('|') as [
              ValidationQueueFilters['sortBy'],
              ValidationQueueFilters['sortOrder'],
            ]
            setFilters({ sortBy, sortOrder })
          }}
          tone="gray"
        />
      </div>
    </div>
  )
}

// ── Composant principal : file d'attente des validations ─────────────────────

export function ValidationQueue({ operatorId = '' }: { operatorId?: string }) {
  const router = useRouter()
  const { requests, filters, setFilters, isLoading, error, pendingCount } =
    useValidationQueue()

  // AC1-3 : Abonnement Realtime — operatorId passé en prop depuis le layout/page
  const resolvedOperatorId = operatorId || requests[0]?.operatorId || ''
  useValidationRealtime(resolvedOperatorId)

  const handleRequestClick = (requestId: string) => {
    router.push(`/modules/validation-hub/${requestId}`)
  }

  // Tri : pending en premier, puis par date
  const sortedRequests = [...requests].sort((a, b) => {
    const aPending = a.status === 'pending' ? 0 : 1
    const bPending = b.status === 'pending' ? 0 : 1
    if (aPending !== bPending) return aPending - bPending
    if (filters.sortBy === 'submitted_at') {
      const diff =
        new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
      return filters.sortOrder === 'asc' ? diff : -diff
    }
    if (filters.sortBy === 'client_name') {
      const nameA = a.client?.name ?? ''
      const nameB = b.client?.name ?? ''
      const cmp = nameA.localeCompare(nameB, 'fr')
      return filters.sortOrder === 'asc' ? cmp : -cmp
    }
    return 0
  })

  // ── État d'erreur ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col gap-6 p-6 md:p-8">
        <CockpitHeader
          icon={ShieldCheck}
          title="Validation Hub"
          subtitle="Gérez les demandes de validation de vos clients"
          tone="cyan"
        />
        <CockpitCallout tone="red" icon={AlertCircle} title="Erreur de chargement">
          {error.message}
        </CockpitCallout>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      {/* ── En-tête cockpit ─────────────────────────────────────────────── */}
      <CockpitHeader
        icon={ShieldCheck}
        title="Validation Hub"
        subtitle="Gérez les demandes de validation de vos clients"
        tone="cyan"
        status={
          pendingCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-200">
              <CountBadge count={pendingCount} tone="amber" />
              à traiter
            </span>
          ) : undefined
        }
      />

      {/* ── Filtres en pills ────────────────────────────────────────────── */}
      <FilterBar filters={filters} setFilters={setFilters} />

      {/* ── Contenu : skeleton / liste / empty state ────────────────────── */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          <ValidationCardSkeleton />
          <ValidationCardSkeleton />
          <ValidationCardSkeleton />
          <ValidationCardSkeleton />
        </div>
      ) : sortedRequests.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-3">
          {sortedRequests.map((request) => (
            <ValidationCard
              key={request.id}
              request={request}
              onClick={() => handleRequestClick(request.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

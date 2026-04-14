'use client'

import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage, Badge, Card, CardContent, Skeleton } from '@monprojetpro/ui'
import { cn, formatRelativeDate } from '@monprojetpro/utils'
import { CheckCircle2, Clock, AlertCircle, PauseCircle } from 'lucide-react'
import { useValidationQueue } from '../hooks/use-validation-queue'
import { useValidationRealtime } from '../hooks/use-validation-realtime'
import type {
  ValidationRequest,
  ValidationRequestStatus,
  ValidationRequestType,
  ValidationQueueFilters,
} from '../types/validation.types'

// Badge config for status
const STATUS_CONFIG: Record<
  ValidationRequestStatus,
  { label: string; className: string }
> = {
  pending: {
    label: 'En attente',
    className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  },
  approved: {
    label: 'Approuvé',
    className: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  rejected: {
    label: 'Refusé',
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
  needs_clarification: {
    label: 'Précisions demandées',
    className: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
}

// Badge config for type
const TYPE_CONFIG: Record<
  ValidationRequestType,
  { label: string; className: string }
> = {
  brief_lab: {
    label: 'Brief Lab',
    className: 'bg-[#E07856]/20 text-[#E07856] border-[#E07856]/30',
  },
  evolution_one: {
    label: 'Évolution One',
    className: 'bg-[#F7931E]/20 text-[#F7931E] border-[#F7931E]/30',
  },
}

function ValidationCardSkeleton() {
  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-48" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="p-4 rounded-full bg-green-500/10">
        <CheckCircle2 className="h-8 w-8 text-green-400" />
      </div>
      <div>
        <p className="text-lg font-medium text-foreground">
          Aucune demande en attente — tout est à jour !
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Toutes les demandes ont été traitées.
        </p>
      </div>
    </div>
  )
}

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
  const initials = request.client?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '??'

  return (
    <Card
      className="bg-card/50 border-border/50 hover:border-primary/40 hover:bg-card/80 transition-all duration-200 cursor-pointer"
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
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            {request.client?.avatarUrl && (
              <AvatarImage
                src={request.client.avatarUrl}
                alt={request.client.name}
              />
            )}
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="font-medium text-foreground text-sm truncate block">
                  {request.client?.name ?? 'Client inconnu'}
                </span>
                {request.client?.company && (
                  <span className="text-xs text-muted-foreground truncate block">
                    {request.client.company}
                  </span>
                )}
              </div>
              <Badge
                variant="outline"
                className={cn('shrink-0 text-xs border', statusConfig.className)}
              >
                {statusConfig.label}
              </Badge>
            </div>

            <p className="text-sm text-foreground/90 mt-1.5 line-clamp-2">
              {request.title}
            </p>

            <div className="flex items-center gap-3 mt-2">
              <Badge
                variant="outline"
                className={cn('text-xs border', typeConfig.className)}
              >
                {typeConfig.label}
              </Badge>
              {isPostponed && (
                <Badge
                  variant="outline"
                  className="text-xs border border-orange-500/30 bg-orange-500/10 text-orange-400"
                >
                  <PauseCircle className="h-3 w-3 mr-1" />
                  Reportée
                </Badge>
              )}
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatRelativeDate(request.submittedAt)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function FilterBar({
  filters,
  setFilters,
}: {
  filters: ValidationQueueFilters
  setFilters: (f: Partial<ValidationQueueFilters>) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Statut */}
      <div className="flex items-center gap-1.5">
        <label htmlFor="status-filter" className="text-xs text-muted-foreground whitespace-nowrap">
          Statut :
        </label>
        <select
          id="status-filter"
          value={filters.status}
          onChange={(e) =>
            setFilters({ status: e.target.value as ValidationQueueFilters['status'] })
          }
          className="text-sm bg-card border border-border rounded-md px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="all">Tous</option>
          <option value="pending">En attente</option>
          <option value="approved">Approuvé</option>
          <option value="rejected">Refusé</option>
          <option value="needs_clarification">Précisions demandées</option>
        </select>
      </div>

      {/* Type */}
      <div className="flex items-center gap-1.5">
        <label htmlFor="type-filter" className="text-xs text-muted-foreground whitespace-nowrap">
          Type :
        </label>
        <select
          id="type-filter"
          value={filters.type}
          onChange={(e) =>
            setFilters({ type: e.target.value as ValidationQueueFilters['type'] })
          }
          className="text-sm bg-card border border-border rounded-md px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="all">Tous</option>
          <option value="brief_lab">Brief Lab</option>
          <option value="evolution_one">Évolution One</option>
        </select>
      </div>

      {/* Tri */}
      <div className="flex items-center gap-1.5">
        <label htmlFor="sort-filter" className="text-xs text-muted-foreground whitespace-nowrap">
          Trier par :
        </label>
        <select
          id="sort-filter"
          value={`${filters.sortBy}_${filters.sortOrder}`}
          onChange={(e) => {
            const [sortBy, sortOrder] = e.target.value.split('_') as [
              ValidationQueueFilters['sortBy'],
              ValidationQueueFilters['sortOrder'],
            ]
            setFilters({ sortBy, sortOrder })
          }}
          className="text-sm bg-card border border-border rounded-md px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="submitted_at_asc">Date (plus ancienne)</option>
          <option value="submitted_at_desc">Date (plus récente)</option>
        </select>
      </div>
    </div>
  )
}

export function ValidationQueue({ operatorId = '' }: { operatorId?: string }) {
  const router = useRouter()
  const { requests, filters, setFilters, isLoading, error, pendingCount } =
    useValidationQueue()

  // AC1-3: Abonnement Realtime — operatorId passé en prop depuis le layout/page
  const resolvedOperatorId = operatorId || requests[0]?.operatorId || ''
  useValidationRealtime(resolvedOperatorId)

  const handleRequestClick = (requestId: string) => {
    router.push(`/modules/validation-hub/${requestId}`)
  }

  // Sort: pending first, then by submitted_at ascending (default)
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="p-4 rounded-full bg-red-500/10">
          <AlertCircle className="h-8 w-8 text-red-400" />
        </div>
        <div>
          <p className="text-lg font-medium text-foreground">
            Erreur lors du chargement
          </p>
          <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-foreground">
            Validation Hub
          </h1>
          {pendingCount > 0 && (
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 border text-xs">
              {pendingCount} en attente
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Gérez les demandes de validation de vos clients
        </p>
      </div>

      {/* Filters */}
      <FilterBar filters={filters} setFilters={setFilters} />

      {/* Content */}
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

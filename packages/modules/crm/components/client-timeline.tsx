'use client'

import { Button, CockpitPanel, CockpitCallout, RowSkeleton } from '@monprojetpro/ui'
import { useClientActivityLogs } from '../hooks/use-client-activity-logs'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useRouter, usePathname } from 'next/navigation'
import { ArrowRight, AlertCircle } from 'lucide-react'
import { cn } from '@monprojetpro/utils'
import { resolveEventConfig } from '../utils/activity-event-config'

interface ClientTimelineProps {
  clientId: string
}

export function ClientTimeline({ clientId }: ClientTimelineProps) {
  const router = useRouter()
  const pathname = usePathname()

  const {
    data,
    isPending,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useClientActivityLogs(clientId)

  const navigateTo = (tab: string) => {
    router.push(`${pathname}?tab=${tab}`)
  }

  if (isPending) {
    return (
      <CockpitPanel title="Historique">
        <div className="space-y-3 p-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="shrink-0">
                <div className="h-9 w-9 animate-pulse rounded-full bg-white/5" />
              </div>
              <div className="flex-1 space-y-2 pt-1">
                <div className="flex items-center justify-between gap-3">
                  <RowSkeleton className="w-40" />
                  <RowSkeleton className="w-20" />
                </div>
                <RowSkeleton className="w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </CockpitPanel>
    )
  }

  if (error) {
    return (
      <CockpitPanel title="Historique">
        <div className="p-2">
          <CockpitCallout tone="red" icon={AlertCircle}>
            Impossible de charger l&apos;historique.
          </CockpitCallout>
        </div>
      </CockpitPanel>
    )
  }

  const logs = data?.pages.flat() ?? []

  if (logs.length === 0) {
    return (
      <CockpitPanel title="Historique">
        <div className="p-6 text-center text-sm text-gray-500">
          Aucune activité enregistrée pour ce client.
        </div>
      </CockpitPanel>
    )
  }

  return (
    <CockpitPanel title="Historique">
      <div className="p-3">
        <div className="space-y-0">
          {logs.map((log, index) => {
            const config = resolveEventConfig(log.eventType)
            const { Icon, iconClass, label, tab, actionLabel } = config
            const isLast = index === logs.length - 1

            const timeAgo = formatDistanceToNow(new Date(log.createdAt), {
              addSuffix: true,
              locale: fr,
            })

            return (
              <div key={log.id} className="flex gap-4">
                {/* Timeline line + icon */}
                <div className="flex shrink-0 flex-col items-center">
                  <div
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full',
                      iconClass
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  {!isLast && (
                    <div
                      className="w-px flex-1 bg-white/10"
                      style={{ minHeight: '1.5rem' }}
                    />
                  )}
                </div>

                {/* Content */}
                <div className={cn('flex-1 pb-6', isLast && 'pb-0')}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-5 text-gray-200">{label}</p>
                      {log.description && log.description !== label && (
                        <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
                          {log.description}
                        </p>
                      )}
                      {log.actorLabel && (
                        <p className="mt-0.5 text-xs italic text-gray-600">
                          {log.actorLabel}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="whitespace-nowrap text-xs text-gray-600">
                        {timeAgo}
                      </span>
                      {tab && actionLabel && (
                        <button
                          type="button"
                          onClick={() => navigateTo(tab)}
                          className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-cyan-400 hover:text-cyan-300 hover:underline"
                        >
                          {actionLabel}
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {hasNextPage && (
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="border-white/10 text-gray-300 hover:bg-white/5"
            >
              {isFetchingNextPage ? 'Chargement...' : 'Charger plus'}
            </Button>
          </div>
        )}
      </div>
    </CockpitPanel>
  )
}

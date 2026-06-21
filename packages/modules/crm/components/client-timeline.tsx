'use client'

import { Skeleton, Button } from '@monprojetpro/ui'
import { useClientActivityLogs } from '../hooks/use-client-activity-logs'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useRouter, usePathname } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
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
      <div className="mt-6 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-6 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
        Impossible de charger l&apos;historique.
      </div>
    )
  }

  const logs = data?.pages.flat() ?? []

  if (logs.length === 0) {
    return (
      <div className="mt-6 rounded-lg border border-dashed p-10 text-center text-muted-foreground text-sm">
        Aucune activité enregistrée pour ce client.
      </div>
    )
  }

  return (
    <div className="mt-6">
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
              <div className="flex flex-col items-center shrink-0">
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
                    className="w-px flex-1 bg-border"
                    style={{ minHeight: '1.5rem' }}
                  />
                )}
              </div>

              {/* Content */}
              <div className={cn('flex-1 pb-6', isLast && 'pb-0')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm leading-5">{label}</p>
                    {log.description && log.description !== label && (
                      <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                        {log.description}
                      </p>
                    )}
                    {log.actorLabel && (
                      <p className="mt-0.5 text-xs text-muted-foreground/70 italic">
                        {log.actorLabel}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {timeAgo}
                    </span>
                    {tab && actionLabel && (
                      <button
                        type="button"
                        onClick={() => navigateTo(tab)}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium whitespace-nowrap"
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
          >
            {isFetchingNextPage ? 'Chargement...' : 'Charger plus'}
          </Button>
        </div>
      )}
    </div>
  )
}

'use client'

import { Card, CardContent, Skeleton, Button } from '@foxeo/ui'
import { useClientActivityLogs } from '../hooks/use-client-activity-logs'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

interface ClientTimelineProps {
  clientId: string
}

const eventTypeLabels: Record<string, string> = {
  client_created: 'Client cree',
  status_changed: 'Statut modifie',
  validation_submitted: 'Brief soumis',
  validation_approved: 'Brief approuve',
  validation_rejected: 'Brief refuse',
  visio_completed: 'Visio terminee',
  graduated_to_one: 'Gradue vers One',
  document_shared: 'Document partage',
  message_sent: 'Message envoye',
}

const eventTypeIcons: Record<string, string> = {
  client_created: '🎉',
  status_changed: '🔄',
  validation_submitted: '📝',
  validation_approved: '✅',
  validation_rejected: '❌',
  visio_completed: '📹',
  graduated_to_one: '🎓',
  document_shared: '📄',
  message_sent: '💬',
}

export function ClientTimeline({ clientId }: ClientTimelineProps) {
  const {
    data,
    isPending,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useClientActivityLogs(clientId)

  if (isPending) {
    return (
      <div className="space-y-4 mt-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-baseline justify-between">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return <div className="p-4 text-destructive">Erreur de chargement</div>
  }

  const logs = data?.pages.flat() ?? []

  if (logs.length === 0) {
    return (
      <Card className="mt-6">
        <CardContent className="p-8 text-center text-muted-foreground">
          Aucune activite enregistree
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="mt-6 space-y-0">
      {logs.map((log, index) => {
        const timeAgo = formatDistanceToNow(new Date(log.createdAt), {
          addSuffix: true,
          locale: fr,
        })
        const isLast = index === logs.length - 1

        return (
          <div key={log.id} className="flex gap-4">
            {/* Ligne verticale + icône */}
            <div className="flex flex-col items-center">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-card text-base">
                {eventTypeIcons[log.eventType] || '📌'}
              </div>
              {!isLast && (
                <div className="w-px flex-1 bg-border" style={{ minHeight: '1.5rem' }} />
              )}
            </div>

            {/* Contenu */}
            <div className={`flex-1 pb-6 ${isLast ? 'pb-0' : ''}`}>
              <div className="flex items-baseline justify-between">
                <h4 className="font-medium">
                  {eventTypeLabels[log.eventType] || log.eventType}
                </h4>
                <span className="text-xs text-muted-foreground">{timeAgo}</span>
              </div>
              {log.description && (
                <p className="mt-1 text-sm text-muted-foreground">{log.description}</p>
              )}
            </div>
          </div>
        )
      })}

      {hasNextPage && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
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

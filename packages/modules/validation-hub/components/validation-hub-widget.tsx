'use client'

import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent, CardFooter, Button, Skeleton } from '@monprojetpro/ui'
import { AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react'
import { formatRelativeDate } from '@monprojetpro/utils'
import { useValidationQueue } from '../hooks/use-validation-queue'
import { useValidationRealtime } from '../hooks/use-validation-realtime'

export function ValidationHubWidget({ operatorId = '' }: { operatorId?: string }) {
  // AC5: Le widget se met à jour en temps réel via Realtime
  useValidationRealtime(operatorId)
  const { requests, pendingCount, isLoading } = useValidationQueue()
  const pendingRequests = requests.filter((r) => r.status === 'pending')
  const latestRequest = pendingRequests[0]

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Validations en attente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-36" />
        </CardContent>
      </Card>
    )
  }

  if (pendingCount === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Validations en attente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <p className="text-sm">Aucune demande en attente — tout est à jour !</p>
          </div>
        </CardContent>
        <CardFooter>
          <Link href="/modules/validation-hub" className="w-full">
            <Button className="w-full" variant="outline">
              Voir le Validation Hub
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Validations en attente</CardTitle>
        <AlertCircle className="h-5 w-5 text-destructive" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="text-3xl font-bold text-destructive">{pendingCount}</div>
            <p className="text-sm text-muted-foreground">
              {pendingCount === 1 ? 'demande' : 'demandes'} en attente
            </p>
          </div>

          {latestRequest && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium">Dernière demande :</p>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {latestRequest.title}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {latestRequest.client?.name ?? 'Client inconnu'} •{' '}
                {formatRelativeDate(latestRequest.submittedAt)}
              </p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Link href="/modules/validation-hub" className="w-full">
          <Button className="w-full" variant="outline">
            Voir toutes les demandes
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}

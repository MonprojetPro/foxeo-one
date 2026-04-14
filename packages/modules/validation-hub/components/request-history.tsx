'use client'

import Link from 'next/link'
import { MessageSquare } from 'lucide-react'
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  Separator,
  Skeleton,
} from '@monprojetpro/ui'
import { cn, formatRelativeDate, truncate } from '@monprojetpro/utils'
import type {
  ValidationRequestSummary,
  MessageSummary,
} from '../types/validation.types'
import { useClientHistory } from '../hooks/use-client-history'
import { STATUS_CONFIG } from '../utils/status-config'

type RequestHistoryProps = {
  clientId: string
  requestId: string
  clientName: string
}

export function RequestHistory({
  clientId,
  requestId,
  clientName,
}: RequestHistoryProps) {
  const {
    previousRequests,
    recentMessages,
    isLoadingRequests,
    isLoadingMessages,
  } = useClientHistory(clientId, requestId)

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Historique
        </h2>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Dernières demandes */}
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground">
            Dernières demandes
          </h3>

          {isLoadingRequests ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : previousRequests.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              Aucune demande précédente
            </p>
          ) : (
            <div className="space-y-1.5">
              {previousRequests.map((req) => (
                <PreviousRequestItem key={req.id} request={req} />
              ))}
            </div>
          )}

          <Link
            href={`/modules/validation-hub?clientId=${clientId}`}
            className="text-xs text-primary hover:underline"
          >
            Voir toutes les demandes de {clientName}
          </Link>
        </div>

        <Separator className="bg-border/50" />

        {/* Derniers messages */}
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            Derniers messages
          </h3>

          {isLoadingMessages ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : recentMessages.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              Aucun message récent
            </p>
          ) : (
            <div className="space-y-1.5">
              {recentMessages.map((msg) => (
                <MessageItem key={msg.id} message={msg} />
              ))}
            </div>
          )}

          <Link
            href={`/modules/chat/${clientId}`}
            className="text-xs text-primary hover:underline"
          >
            Ouvrir le chat complet
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

function PreviousRequestItem({
  request,
}: {
  request: ValidationRequestSummary
}) {
  const statusConfig = STATUS_CONFIG[request.status]

  return (
    <Link
      href={`/modules/validation-hub/${request.id}`}
      className="flex items-center gap-2 p-2 rounded hover:bg-muted/30 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">
          {request.title}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatRelativeDate(request.submittedAt)}
        </p>
      </div>
      <Badge
        variant="outline"
        className={cn('text-[10px] border shrink-0', statusConfig.className)}
      >
        {statusConfig.label}
      </Badge>
    </Link>
  )
}

function MessageItem({ message }: { message: MessageSummary }) {
  const isOperator = message.senderType === 'operator'

  return (
    <div className="p-2 rounded bg-muted/20 space-y-0.5">
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            'text-[10px] font-medium',
            isOperator ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          {isOperator ? 'MiKL' : 'Client'}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {formatRelativeDate(message.createdAt)}
        </span>
      </div>
      <p className="text-xs text-foreground/80">
        {truncate(message.content, 60)}
      </p>
    </div>
  )
}

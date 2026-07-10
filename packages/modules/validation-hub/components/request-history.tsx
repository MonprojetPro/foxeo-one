'use client'

import Link from 'next/link'
import { MessageSquare } from 'lucide-react'
import { Badge } from '@monprojetpro/ui'
import { CockpitPanel, BlockSkeleton, SectionTitle } from '@monprojetpro/ui'
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
    <CockpitPanel title="Historique" tone="cyan">
      <div className="space-y-4 p-3">
        {/* Bloc — Dernières demandes */}
        <div className="space-y-2">
          <SectionTitle>Dernières demandes</SectionTitle>

          {isLoadingRequests ? (
            <div className="space-y-2">
              <BlockSkeleton className="h-12 w-full" />
              <BlockSkeleton className="h-12 w-full" />
            </div>
          ) : previousRequests.length === 0 ? (
            <p className="text-xs italic text-gray-500">
              Aucune demande précédente
            </p>
          ) : (
            <div className="space-y-1">
              {previousRequests.map((req) => (
                <PreviousRequestItem key={req.id} request={req} />
              ))}
            </div>
          )}

          <Link
            href={`/modules/validation-hub?clientId=${clientId}`}
            className="text-xs text-cyan-300/80 transition-colors hover:text-cyan-200"
          >
            Voir toutes les demandes de {clientName}
          </Link>
        </div>

        <div className="border-t border-white/10" />

        {/* Bloc — Derniers messages */}
        <div className="space-y-2">
          <SectionTitle>
            <span className="flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Derniers messages
            </span>
          </SectionTitle>

          {isLoadingMessages ? (
            <div className="space-y-2">
              <BlockSkeleton className="h-10 w-full" />
              <BlockSkeleton className="h-10 w-full" />
            </div>
          ) : recentMessages.length === 0 ? (
            <p className="text-xs italic text-gray-500">
              Aucun message récent
            </p>
          ) : (
            <div className="space-y-1">
              {recentMessages.map((msg) => (
                <MessageItem key={msg.id} message={msg} />
              ))}
            </div>
          )}

          <Link
            href={`/modules/chat/${clientId}`}
            className="text-xs text-cyan-300/80 transition-colors hover:text-cyan-200"
          >
            Ouvrir le chat complet
          </Link>
        </div>
      </div>
    </CockpitPanel>
  )
}

// ── Item — demande précédente ──────────────────────────────────────────────

function PreviousRequestItem({
  request,
}: {
  request: ValidationRequestSummary
}) {
  const statusConfig = STATUS_CONFIG[request.status]

  return (
    <Link
      href={`/modules/validation-hub/${request.id}`}
      className="flex items-center gap-2 rounded-xl p-2 transition-colors hover:bg-white/[0.03]"
    >
      <div className="flex-1 min-w-0">
        <p className="truncate text-xs font-medium text-gray-200">
          {request.title}
        </p>
        <p className="text-xs text-gray-500 tabular-nums">
          {formatRelativeDate(request.submittedAt)}
        </p>
      </div>
      <Badge
        variant="outline"
        className={cn('shrink-0 border text-[10px]', statusConfig.className)}
      >
        {statusConfig.label}
      </Badge>
    </Link>
  )
}

// ── Item — message récent ──────────────────────────────────────────────────

function MessageItem({ message }: { message: MessageSummary }) {
  const isOperator = message.senderType === 'operator'

  return (
    <div className="space-y-0.5 rounded-xl bg-white/[0.02] p-2">
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            'text-[10px] font-medium',
            isOperator ? 'text-cyan-300' : 'text-gray-400'
          )}
        >
          {isOperator ? 'MiKL' : 'Client'}
        </span>
        <span className="text-[10px] text-gray-500 tabular-nums">
          {formatRelativeDate(message.createdAt)}
        </span>
      </div>
      <p className="text-xs text-gray-300">
        {truncate(message.content, 60)}
      </p>
    </div>
  )
}

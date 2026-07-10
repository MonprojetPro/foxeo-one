'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar } from 'lucide-react'
import { Badge, Button } from '@monprojetpro/ui'
import { cn, formatFullDate } from '@monprojetpro/utils'
import type {
  ValidationRequestType,
  ValidationRequestStatus,
} from '../types/validation.types'
import { STATUS_CONFIG, TYPE_CONFIG } from '../utils/status-config'

type RequestHeaderProps = {
  title: string
  type: ValidationRequestType
  status: ValidationRequestStatus
  submittedAt: string
}

export function RequestHeader({
  title,
  type,
  status,
  submittedAt,
}: RequestHeaderProps) {
  const router = useRouter()
  const statusConfig = STATUS_CONFIG[status]
  const typeConfig = TYPE_CONFIG[type]

  return (
    /* Bandeau cockpit : fond verre sur noir, bordure fine, arrondi 2xl */
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4">
      <div className="flex items-start gap-4">
        {/* Retour vers la file d'attente */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/modules/validation-hub')}
          className="shrink-0 text-gray-400 hover:bg-white/[0.04] hover:text-white"
          aria-label="Retour à la file d'attente"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          File d&apos;attente
        </Button>

        <div className="flex-1 min-w-0">
          {/* Titre de la demande */}
          <h1 className="truncate text-xl font-semibold text-white">
            {title}
          </h1>

          {/* Badges type + statut + date */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn('border text-xs', typeConfig.className)}
            >
              {typeConfig.label}
            </Badge>
            <Badge
              variant="outline"
              className={cn('border text-xs', statusConfig.className)}
            >
              {statusConfig.label}
            </Badge>
            <span className="flex items-center gap-1 text-xs text-gray-500 tabular-nums">
              <Calendar className="h-3 w-3" />
              {formatFullDate(submittedAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar } from 'lucide-react'
import { Badge, Button, Card, CardContent } from '@monprojetpro/ui'
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
    <Card className="bg-card/50 border-border/50">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/modules/validation-hub')}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Retour à la file d'attente"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            File d&apos;attente
          </Button>

          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-foreground truncate">
              {title}
            </h1>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge
                variant="outline"
                className={cn('text-xs border', typeConfig.className)}
              >
                {typeConfig.label}
              </Badge>
              <Badge
                variant="outline"
                className={cn('text-xs border', statusConfig.className)}
              >
                {statusConfig.label}
              </Badge>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {formatFullDate(submittedAt)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '../button'
import { t } from '@monprojetpro/utils'
// Ensure messages are loaded
import '../messages/init'

export type ErrorDisplayProps = {
  title?: string
  message?: string
  onRetry?: () => void
}

export function ErrorDisplay({
  title = t('errorDisplay.defaultTitle'),
  message = t('errorDisplay.defaultMessage'),
  onRetry,
}: ErrorDisplayProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-lg border border-destructive/20 bg-card p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>

      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          {t('errorDisplay.retryButton')}
        </Button>
      )}
    </div>
  )
}

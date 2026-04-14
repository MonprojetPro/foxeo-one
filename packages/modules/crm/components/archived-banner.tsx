'use client'

import { useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button, showSuccess, showError } from '@monprojetpro/ui'
import { Archive, Play } from 'lucide-react'
import { reactivateClient } from '../actions/reactivate-client'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface ArchivedBannerProps {
  clientId: string
  archivedAt: string | null
}

export function ArchivedBanner({ clientId, archivedAt }: ArchivedBannerProps) {
  const [isPending, startTransition] = useTransition()
  const queryClient = useQueryClient()

  const handleReactivate = () => {
    startTransition(async () => {
      const result = await reactivateClient({ clientId })

      if (result.error) {
        showError(result.error.message)
        return
      }

      showSuccess('Client réactivé')
      await queryClient.invalidateQueries({ queryKey: ['clients'] })
      await queryClient.invalidateQueries({ queryKey: ['client', clientId] })
    })
  }

  const formattedDate = archivedAt
    ? format(new Date(archivedAt), 'dd MMMM yyyy', { locale: fr })
    : null

  return (
    <div
      role="alert"
      className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3"
    >
      <div className="flex items-center gap-3">
        <Archive className="h-5 w-5 shrink-0 text-destructive" />
        <div>
          <h3 className="font-semibold text-destructive">Client clôturé</h3>
          <p className="text-sm text-muted-foreground">
            {formattedDate
              ? `Ce client a été clôturé le ${formattedDate}. Les données sont en lecture seule.`
              : 'Ce client a été clôturé. Les données sont en lecture seule.'}
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={handleReactivate}
        disabled={isPending}
      >
        <Play className="mr-2 h-4 w-4" />
        {isPending ? 'Réactivation...' : 'Réactiver'}
      </Button>
    </div>
  )
}

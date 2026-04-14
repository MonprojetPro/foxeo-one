import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle, Button } from '@monprojetpro/ui'

interface DraftRestoreBannerProps {
  hasDraft: boolean
  draftDate: Date | null
  onRestore: () => void
  onDismiss: () => void
}

/**
 * Banner displayed when a draft is found for a form.
 * Allows user to restore or dismiss the draft.
 *
 * @example
 * ```tsx
 * const { hasDraft, draftDate, restoreDraft, clearDraft } = useDraftForm(...)
 *
 * <DraftRestoreBanner
 *   hasDraft={hasDraft}
 *   draftDate={draftDate}
 *   onRestore={restoreDraft}
 *   onDismiss={clearDraft}
 * />
 * ```
 */
export function DraftRestoreBanner({
  hasDraft,
  draftDate,
  onRestore,
  onDismiss,
}: DraftRestoreBannerProps) {
  if (!hasDraft) {
    return null
  }

  const formattedDate = draftDate
    ? new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(draftDate)
    : 'date inconnue'

  return (
    <Alert variant="default" className="mb-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
      <AlertTitle className="text-amber-900 dark:text-amber-100">
        Un brouillon a été trouvé
      </AlertTitle>
      <AlertDescription className="text-amber-800 dark:text-amber-200">
        <p className="mb-3">Sauvegardé le {formattedDate}</p>
        <div className="flex gap-2">
          <Button onClick={onRestore} variant="default" size="sm">
            Reprendre
          </Button>
          <Button onClick={onDismiss} variant="outline" size="sm">
            Non, recommencer
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}

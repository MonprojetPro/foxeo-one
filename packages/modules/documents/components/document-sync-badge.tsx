'use client'

import { Badge } from '@monprojetpro/ui'

interface DocumentSyncBadgeProps {
  lastSyncedAt: string | null
}

const MS_PER_DAY = 24 * 60 * 60 * 1000
const STALE_THRESHOLD_DAYS = 7

/**
 * Badge compact "Syncé le {date}" affiché si lastSyncedAt est non-null.
 * Affiche en gris clair si > 7 jours (sync ancienne).
 *
 * AC3: Visuel de traçabilité de synchronisation dans la vue Hub.
 */
export function DocumentSyncBadge({ lastSyncedAt }: DocumentSyncBadgeProps) {
  if (!lastSyncedAt) return null

  const syncDate = new Date(lastSyncedAt)
  const now = new Date()
  const ageMs = now.getTime() - syncDate.getTime()
  const isStale = ageMs > STALE_THRESHOLD_DAYS * MS_PER_DAY

  const formattedDate = syncDate.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return (
    <Badge
      variant={isStale ? 'outline' : 'secondary'}
      className={isStale ? 'text-muted-foreground' : undefined}
      data-testid="document-sync-badge"
    >
      Syncé le {formattedDate}
    </Badge>
  )
}

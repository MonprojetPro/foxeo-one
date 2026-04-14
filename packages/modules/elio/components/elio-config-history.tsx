'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, RotateCcw } from 'lucide-react'
import { Button } from '@monprojetpro/ui'
import { cn } from '@monprojetpro/utils'
import { getElioConfigHistory, type ElioConfigElioConfigHistoryEntry } from '../actions/get-elio-config-history'
import { restoreElioConfig } from '../actions/restore-elio-config'

interface ElioConfigHistoryProps {
  clientId: string
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ConfigDiff({
  oldValue,
  newValue,
}: {
  oldValue: Record<string, unknown> | null
  newValue: Record<string, unknown> | null
}) {
  if (!oldValue && !newValue) return null

  const allKeys = new Set([
    ...Object.keys(oldValue ?? {}),
    ...Object.keys(newValue ?? {}),
  ])

  const changedFields = Array.from(allKeys).filter(
    (k) => JSON.stringify((oldValue ?? {})[k]) !== JSON.stringify((newValue ?? {})[k])
  )

  if (changedFields.length === 0) {
    return <p className="text-xs text-muted-foreground">Aucune différence détectée</p>
  }

  return (
    <div className="space-y-1.5 mt-2">
      {changedFields.map((key) => (
        <div key={key} className="text-xs grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <span className="text-right text-destructive/80 line-through font-mono truncate">
            {String((oldValue ?? {})[key] ?? '—')}
          </span>
          <span className="text-muted-foreground font-bold shrink-0">{key}</span>
          <span className="text-left text-green-600 dark:text-green-400 font-mono truncate">
            {String((newValue ?? {})[key] ?? '—')}
          </span>
        </div>
      ))}
    </div>
  )
}

interface ConfirmRestoreModalProps {
  entry: ElioConfigHistoryEntry
  onConfirm: () => void
  onCancel: () => void
  isPending: boolean
}

function ConfirmRestoreModal({ entry, onConfirm, onCancel, isPending }: ConfirmRestoreModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="restore-modal-title"
      data-testid="restore-confirm-modal"
    >
      <div className="bg-card border rounded-xl p-6 max-w-md w-full mx-4 shadow-lg">
        <h3 id="restore-modal-title" className="text-base font-semibold mb-2">
          Restaurer cette configuration ?
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          La configuration Élio du client sera remplacée par celle du{' '}
          <strong>{formatDate(entry.changedAt)}</strong>. Cette action est irréversible
          (mais sera enregistrée dans l&apos;historique).
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={isPending}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onConfirm}
            disabled={isPending}
            data-testid="confirm-restore-btn"
          >
            {isPending ? 'Restauration…' : 'Restaurer'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function ElioConfigHistory({ clientId }: ElioConfigHistoryProps) {
  const queryClient = useQueryClient()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [restoreTarget, setRestoreTarget] = useState<ElioConfigHistoryEntry | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)

  const { data: history, isLoading } = useQuery({
    queryKey: ['elio-config-history', clientId],
    queryFn: async () => {
      const result = await getElioConfigHistory(clientId)
      if (result.error) throw new Error(result.error.message)
      return result.data ?? []
    },
  })

  const handleRestore = async () => {
    if (!restoreTarget) return
    setIsRestoring(true)

    const result = await restoreElioConfig(clientId, restoreTarget.id)
    setIsRestoring(false)
    setRestoreTarget(null)

    if (!result.error) {
      await queryClient.invalidateQueries({ queryKey: ['elio-config', clientId] })
      await queryClient.invalidateQueries({ queryKey: ['elio-config-history', clientId] })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse" data-testid="elio-config-history-skeleton">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  if (!history || history.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4" data-testid="elio-config-history-empty">
        Aucune modification de configuration enregistrée.
      </p>
    )
  }

  return (
    <>
      <div className="space-y-2" data-testid="elio-config-history">
        {history.map((entry) => {
          const isExpanded = expandedId === entry.id
          return (
            <div key={entry.id} className="border rounded-lg overflow-hidden">
              <div
                className={cn(
                  'flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors',
                  isExpanded && 'bg-muted/30'
                )}
                data-testid={`history-entry-${entry.id}`}
              >
                <button
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  aria-expanded={isExpanded}
                  data-testid={`expand-btn-${entry.id}`}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      Modification de configuration
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(entry.changedAt)}</p>
                  </div>
                </button>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => setRestoreTarget(entry)}
                  data-testid={`restore-btn-${entry.id}`}
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  Restaurer
                </Button>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t bg-muted/10">
                  <ConfigDiff oldValue={entry.oldValue} newValue={entry.newValue} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {restoreTarget && (
        <ConfirmRestoreModal
          entry={restoreTarget}
          onConfirm={handleRestore}
          onCancel={() => setRestoreTarget(null)}
          isPending={isRestoring}
        />
      )}
    </>
  )
}

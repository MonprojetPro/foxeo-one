'use client'

import { useState, useTransition } from 'react'
import { showSuccess, showError } from '@monprojetpro/ui'
import { exportClientData } from '@monprojetpro/module-admin'

interface DataExportSectionProps {
  clientId: string
}

export function DataExportSection({ clientId }: DataExportSectionProps) {
  const [isPending, startTransition] = useTransition()
  const [exported, setExported] = useState(false)

  function handleExport() {
    startTransition(async () => {
      const result = await exportClientData({ clientId, requestedBy: 'client' })

      if (result.error) {
        showError(result.error.message)
        return
      }

      setExported(true)
      showSuccess("Export en cours — vous recevrez une notification quand il sera prêt")
    })
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div>
        <h2 className="text-base font-medium text-foreground">Conformité RGPD</h2>
        <p className="text-sm text-muted-foreground">Mes données personnelles</p>
      </div>

      <p className="text-sm text-muted-foreground">
        Conformément au RGPD, vous pouvez télécharger l&apos;ensemble de vos données personnelles.
      </p>
      <p className="text-xs text-muted-foreground">
        L&apos;export prend généralement 1 à 5 minutes. Vous recevrez une notification avec le lien de téléchargement.
      </p>

      {exported ? (
        <p className="text-sm text-green-600 dark:text-green-400" data-testid="export-success-message">
          Export demandé. Vous recevrez une notification quand il sera prêt.
        </p>
      ) : (
        <button
          type="button"
          onClick={handleExport}
          disabled={isPending}
          data-testid="export-data-button"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Génération en cours…' : 'Exporter toutes mes données'}
        </button>
      )}
    </div>
  )
}

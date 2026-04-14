'use client'

import { useState } from 'react'
import { showSuccess, showError } from '@monprojetpro/ui'
import { exportClientData } from '../actions/export-client-data'

interface ClientExportButtonProps {
  clientId: string
}

export function ClientExportButton({ clientId }: ClientExportButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      const result = await exportClientData({ clientId, requestedBy: 'operator' })
      if (result.error) {
        showError(result.error.message)
      } else {
        showSuccess('Export en cours — vous serez notifié quand il sera prêt')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 max-w-lg">
      <div className="rounded bg-white/5 border border-white/10 p-4 space-y-3">
        <div>
          <p className="text-sm font-medium text-gray-200">Export complet des données</p>
          <p className="text-xs text-gray-400 mt-1">
            Génère une archive ZIP contenant toutes les données du client. Un lien de
            téléchargement vous sera envoyé par notification (valide 7 jours).
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={loading}
          className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Export en cours…' : 'Exporter toutes les données'}
        </button>
      </div>
    </div>
  )
}

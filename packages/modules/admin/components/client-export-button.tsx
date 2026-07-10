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
    <div className="max-w-lg">
      {/* Carte export cockpit */}
      <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div>
          <p className="text-sm font-medium text-gray-200">Export complet des données</p>
          <p className="mt-1 text-xs text-gray-500">
            Génère une archive ZIP contenant toutes les données du client. Un lien de
            téléchargement vous sera envoyé par notification (valide 7 jours).
          </p>
        </div>
        {/* Bouton accent cyan */}
        <button
          type="button"
          onClick={handleExport}
          disabled={loading}
          className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-300 transition-colors hover:border-cyan-400/50 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Export en cours…' : 'Exporter toutes les données'}
        </button>
      </div>
    </div>
  )
}

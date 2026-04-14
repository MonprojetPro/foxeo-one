'use client'

import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { showSuccess, showError } from '@monprojetpro/ui'
import { useMaintenanceConfig } from '../hooks/use-maintenance'
import { toggleMaintenanceMode } from '../actions/toggle-maintenance'

function MaintenancePreview({ message, estimatedDuration }: { message: string; estimatedDuration: string }) {
  return (
    <div className="rounded border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-2">
      <p className="text-xs text-yellow-400 font-medium">Aperçu — Page maintenance client</p>
      <div className="rounded bg-black/40 p-4 text-center space-y-2">
        <div className="text-2xl">🔧</div>
        <p className="text-sm text-gray-200">{message || 'Message de maintenance...'}</p>
        {estimatedDuration && (
          <p className="text-xs text-gray-400">Durée estimée : {estimatedDuration}</p>
        )}
      </div>
    </div>
  )
}

export function MaintenanceMode() {
  const { data: config, isPending } = useMaintenanceConfig()
  const queryClient = useQueryClient()

  const [enabled, setEnabled] = useState(false)
  const [message, setMessage] = useState('La plateforme est en maintenance. Nous serons de retour très bientôt !')
  const [estimatedDuration, setEstimatedDuration] = useState('')
  const [saving, setSaving] = useState(false)

  // Sync from server once loaded
  useEffect(() => {
    if (config) {
      setEnabled(config.enabled)
      setMessage(config.message)
      setEstimatedDuration(config.estimatedDuration ?? '')
    }
  }, [config])

  async function handleSave() {
    setSaving(true)
    const result = await toggleMaintenanceMode({
      enabled,
      message,
      estimatedDuration: estimatedDuration || null,
    })
    setSaving(false)

    if (result.error) {
      showError(result.error.message)
    } else {
      showSuccess(
        enabled
          ? 'Mode maintenance activé'
          : 'Mode maintenance désactivé'
      )
      queryClient.invalidateQueries({ queryKey: ['system-config', 'maintenance'] })
    }
  }

  if (isPending) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 rounded bg-white/5 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-lg">
      {/* Toggle */}
      <div className="flex items-center justify-between rounded bg-white/5 border border-white/10 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-gray-200">Mode maintenance</p>
          <p className="text-xs text-gray-400">Les clients verront la page de maintenance. Hub non affecté.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => setEnabled((v) => !v)}
          className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
            enabled ? 'bg-yellow-500' : 'bg-white/20'
          }`}
          aria-label="Activer/désactiver le mode maintenance"
        >
          <span
            className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
              enabled ? 'translate-x-6' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Message */}
      <div className="space-y-1">
        <label htmlFor="maintenance-message" className="text-sm text-gray-300">
          Message affiché aux clients
        </label>
        <textarea
          id="maintenance-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          maxLength={500}
          className="w-full rounded bg-white/5 border border-white/10 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 resize-none"
          placeholder="Message de maintenance..."
        />
        <p className="text-right text-xs text-gray-500">{message.length}/500</p>
      </div>

      {/* Estimated duration */}
      <div className="space-y-1">
        <label htmlFor="maintenance-duration" className="text-sm text-gray-300">
          Durée estimée (optionnel)
        </label>
        <input
          id="maintenance-duration"
          type="text"
          value={estimatedDuration}
          onChange={(e) => setEstimatedDuration(e.target.value)}
          className="w-full rounded bg-white/5 border border-white/10 px-3 py-2 text-sm text-gray-200 placeholder-gray-500"
          placeholder="ex: 2 heures, 30 minutes..."
        />
      </div>

      {/* Preview */}
      <MaintenancePreview message={message} estimatedDuration={estimatedDuration} />

      {/* Save */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className={`w-full rounded px-4 py-2 text-sm font-medium transition-colors ${
          enabled
            ? 'bg-yellow-500 hover:bg-yellow-400 text-black'
            : 'bg-green-600 hover:bg-green-500 text-white'
        } disabled:opacity-50`}
      >
        {saving
          ? 'Enregistrement...'
          : enabled
          ? 'Activer la maintenance'
          : 'Désactiver la maintenance'}
      </button>
    </div>
  )
}

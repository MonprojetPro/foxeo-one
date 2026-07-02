'use client'

import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { showSuccess, showError, useConfirmDialog } from '@monprojetpro/ui'
import { useMaintenanceConfig } from '../hooks/use-maintenance'
import { toggleMaintenanceMode } from '../actions/toggle-maintenance'

function MaintenancePreview({
  active,
  message,
  estimatedDuration,
}: {
  active: boolean
  message: string
  estimatedDuration: string
}) {
  return (
    <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-yellow-400 font-medium">Aperçu — Page maintenance client</p>
        <span
          className={`text-[11px] rounded-full px-2 py-0.5 font-medium ${
            active
              ? 'bg-yellow-500/20 text-yellow-300'
              : 'bg-white/10 text-gray-400'
          }`}
        >
          {active ? 'En ligne pour les clients' : 'Non visible (inactif)'}
        </span>
      </div>

      {/* Reproduction fidèle de apps/client/app/maintenance/page.tsx */}
      <div className="rounded-md bg-[#020402] px-4 py-10 text-center space-y-5 border border-white/5">
        <div className="text-5xl" aria-hidden="true">🔧</div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-white">Maintenance en cours</h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            {message || 'La plateforme est en maintenance. Nous serons de retour très bientôt !'}
          </p>
          {estimatedDuration && (
            <p className="text-xs text-gray-500">
              Durée estimée : <span className="text-gray-300">{estimatedDuration}</span>
            </p>
          )}
        </div>
        <div className="border-t border-white/10 pt-3">
          <p className="text-[11px] text-gray-600">
            Merci de votre patience. Si vous avez une urgence, contactez votre conseiller.
          </p>
        </div>
      </div>
    </div>
  )
}

export function MaintenanceMode() {
  const { data: config, isPending } = useMaintenanceConfig()
  const queryClient = useQueryClient()
  const { confirm, ConfirmDialog } = useConfirmDialog()

  // `enabled` reflète l'état RÉELLEMENT enregistré en base (piloté par le toggle).
  const [enabled, setEnabled] = useState(false)
  const [message, setMessage] = useState('La plateforme est en maintenance. Nous serons de retour très bientôt !')
  const [estimatedDuration, setEstimatedDuration] = useState('')
  // État "réglages" séparé pour savoir si le message/durée diffèrent de la base.
  const [savedMessage, setSavedMessage] = useState(message)
  const [savedDuration, setSavedDuration] = useState('')
  const [toggling, setToggling] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)

  // Sync depuis le serveur une fois chargé
  useEffect(() => {
    if (config) {
      setEnabled(config.enabled)
      setMessage(config.message)
      setEstimatedDuration(config.estimatedDuration ?? '')
      setSavedMessage(config.message)
      setSavedDuration(config.estimatedDuration ?? '')
    }
  }, [config])

  const settingsDirty = message !== savedMessage || estimatedDuration !== savedDuration

  // Le toggle EST l'interrupteur : il enregistre immédiatement en base.
  async function handleToggle() {
    const next = !enabled

    // Activation = impact sur TOUS les clients → confirmation explicite.
    if (next) {
      const ok = await confirm({
        title: 'Activer le mode maintenance ?',
        description:
          'Tous les clients seront immédiatement redirigés vers la page de maintenance et ne pourront plus accéder à leur espace. Le Hub n’est pas affecté.',
        confirmLabel: 'Activer la maintenance',
        cancelLabel: 'Annuler',
      })
      if (!ok) return
    }

    setToggling(true)
    const result = await toggleMaintenanceMode({
      enabled: next,
      message,
      estimatedDuration: estimatedDuration || null,
    })
    setToggling(false)

    if (result.error) {
      showError(result.error.message)
      return
    }

    setEnabled(next)
    setSavedMessage(message)
    setSavedDuration(estimatedDuration)
    showSuccess(next ? 'Mode maintenance activé' : 'Mode maintenance désactivé')
    queryClient.invalidateQueries({ queryKey: ['system-config', 'maintenance'] })
  }

  // Enregistre uniquement le message / la durée, sans changer l'état on/off.
  async function handleSaveSettings() {
    setSavingSettings(true)
    const result = await toggleMaintenanceMode({
      enabled,
      message,
      estimatedDuration: estimatedDuration || null,
    })
    setSavingSettings(false)

    if (result.error) {
      showError(result.error.message)
      return
    }

    setSavedMessage(message)
    setSavedDuration(estimatedDuration)
    showSuccess('Réglages enregistrés')
    queryClient.invalidateQueries({ queryKey: ['system-config', 'maintenance'] })
  }

  if (isPending) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 rounded bg-white/5 animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded bg-white/5 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Colonne gauche — Réglages */}
      <div className="space-y-6">
        {/* Interrupteur principal */}
        <div
          className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
            enabled
              ? 'border-yellow-500/40 bg-yellow-500/10'
              : 'border-white/10 bg-white/5'
          }`}
        >
          <div className="pr-4">
            <p className="text-sm font-medium text-gray-100">
              Mode maintenance {enabled ? '· actif' : '· inactif'}
            </p>
            <p className="text-xs text-gray-400">
              {enabled
                ? 'Les clients voient la page de maintenance. Hub non affecté.'
                : 'Bascule pour rendre la plateforme indisponible aux clients.'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            disabled={toggling}
            onClick={handleToggle}
            className={`relative w-12 h-6 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50 ${
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
            className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500/40"
            placeholder="Message de maintenance..."
          />
          <p className="text-right text-xs text-gray-500">{message.length}/500</p>
        </div>

        {/* Durée estimée */}
        <div className="space-y-1">
          <label htmlFor="maintenance-duration" className="text-sm text-gray-300">
            Durée estimée (optionnel)
          </label>
          <input
            id="maintenance-duration"
            type="text"
            value={estimatedDuration}
            onChange={(e) => setEstimatedDuration(e.target.value)}
            className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500/40"
            placeholder="ex: 2 heures, 30 minutes..."
          />
        </div>

        {/* Enregistrer les réglages (message + durée), sans toucher au on/off */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={savingSettings || !settingsDirty}
            className="rounded-md bg-white/10 px-4 py-2 text-sm font-medium text-gray-100 transition-colors hover:bg-white/15 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {savingSettings ? 'Enregistrement...' : 'Enregistrer les réglages'}
          </button>
          {settingsDirty && (
            <span className="text-xs text-yellow-400/80">Modifications non enregistrées</span>
          )}
          {enabled && !settingsDirty && (
            <span className="text-xs text-gray-500">Réglages à jour · déjà visibles côté client</span>
          )}
        </div>
      </div>

      {/* Colonne droite — Aperçu live */}
      <div className="lg:pt-1">
        <MaintenancePreview
          active={enabled}
          message={message}
          estimatedDuration={estimatedDuration}
        />
      </div>

      <ConfirmDialog />
    </div>
  )
}

'use client'

import { useState, useTransition, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getAccountantConfig, updateAccountantConfig } from '../actions/update-accountant-config'
import { showSuccess, showError } from '@monprojetpro/ui'
import { Settings, X } from 'lucide-react'

// ── Props ─────────────────────────────────────────────────────────────────────

interface AccountantConfigPanelProps {
  onClose: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AccountantConfigPanel({ onClose }: AccountantConfigPanelProps) {
  const queryClient = useQueryClient()
  const [isSaving, startSave] = useTransition()

  const { data: config, isPending } = useQuery({
    queryKey: ['accountant-config'],
    queryFn: async () => {
      const result = await getAccountantConfig()
      if (result.error) throw new Error(result.error.message)
      return result.data
    },
    staleTime: 5 * 60 * 1_000,
  })

  const [email, setEmail] = useState('')
  const [syncEnabled, setSyncEnabled] = useState(false)

  // Initialiser l'état local quand la config est chargée
  useEffect(() => {
    if (config) {
      setEmail(config.accountantEmail)
      setSyncEnabled(config.syncEnabled)
    }
  }, [config])

  function handleSave() {
    startSave(async () => {
      const result = await updateAccountantConfig(email, syncEnabled)
      if (result.error) {
        showError(result.error.message)
        return
      }
      await queryClient.invalidateQueries({ queryKey: ['accountant-config'] })
      showSuccess('Configuration comptable sauvegardée')
      onClose()
    })
  }

  return (
    <div
      className="rounded-lg border border-border bg-card p-5 flex flex-col gap-4"
      data-testid="accountant-config-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium">Configuration notifications comptable</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {isPending ? (
        <div className="flex flex-col gap-3 animate-pulse">
          <div className="h-4 w-48 bg-muted rounded" />
          <div className="h-9 bg-muted rounded" />
        </div>
      ) : (
        <>
          {/* Email field */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">
              Email de votre comptable Pennylane
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ex: comptable@cabinet.fr"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              data-testid="accountant-email-input"
            />
          </div>

          {/* Toggle sync Gmail */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Activer la synchronisation Gmail</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Détecte automatiquement les demandes de votre comptable
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={syncEnabled}
              onClick={() => setSyncEnabled((v) => !v)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${
                syncEnabled ? 'bg-primary' : 'bg-muted-foreground/30'
              }`}
              data-testid="accountant-sync-toggle"
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  syncEnabled ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Info message */}
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
            Dès que vous recevez un email de votre comptable, nous pourrons l&apos;afficher ici.
            Activez la synchro quand vous êtes prêt.
          </p>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              data-testid="accountant-config-save-btn"
            >
              {isSaving ? 'Enregistrement…' : 'Sauvegarder'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-4 py-1.5 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              Annuler
            </button>
          </div>
        </>
      )}
    </div>
  )
}

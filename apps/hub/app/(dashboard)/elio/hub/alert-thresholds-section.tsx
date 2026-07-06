'use client'

/**
 * Section Seuils d'alertes — pilote les « Suggestions Élio » de l'accueil Hub.
 * 3 champs numériques (jours) + Enregistrer → setAlertThresholds (opérateur only).
 */

import { useState } from 'react'
import { setAlertThresholds } from '@monprojetpro/module-elio'
import type { AlertThresholds } from '@monprojetpro/module-elio'
import { showSuccess, showError } from '@monprojetpro/ui'

const FIELDS: Array<{ key: keyof AlertThresholds; label: string; hint: string }> = [
  {
    key: 'stagnantParcoursDays',
    label: 'Parcours stagnant (jours)',
    hint: 'Alerte si une étape Lab active n’a pas bougé depuis N jours.',
  },
  {
    key: 'silentClientDays',
    label: 'Client silencieux (jours)',
    hint: 'Alerte si aucun message échangé avec un client actif depuis N jours.',
  },
  {
    key: 'oldValidationDays',
    label: 'Validation en attente (jours)',
    hint: 'Alerte si une demande de validation attend depuis plus de N jours.',
  },
]

interface AlertThresholdsSectionProps {
  initialThresholds: AlertThresholds
}

export function AlertThresholdsSection({ initialThresholds }: AlertThresholdsSectionProps) {
  const [values, setValues] = useState<Record<keyof AlertThresholds, string>>({
    stagnantParcoursDays: String(initialThresholds.stagnantParcoursDays),
    silentClientDays: String(initialThresholds.silentClientDays),
    oldValidationDays: String(initialThresholds.oldValidationDays),
  })
  const [isSaving, setIsSaving] = useState(false)

  async function handleSave() {
    const parsedValues = {} as AlertThresholds
    for (const { key, label } of FIELDS) {
      const n = parseInt(values[key], 10)
      if (isNaN(n) || n < 1 || n > 365) {
        showError(`« ${label} » doit être un nombre entier entre 1 et 365.`)
        return
      }
      parsedValues[key] = n
    }

    setIsSaving(true)
    try {
      const { data, error } = await setAlertThresholds(parsedValues)
      if (error) {
        showError(error.message)
      } else if (data) {
        showSuccess('Seuils d’alertes enregistrés — les Suggestions Élio de l’accueil en tiennent compte.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="space-y-4" aria-labelledby="alert-thresholds-title">
      <div>
        <h3 id="alert-thresholds-title" className="text-base font-semibold text-foreground">
          Seuils d&apos;alertes — Suggestions Élio
        </h3>
        <p className="text-xs text-muted-foreground">
          Ces seuils pilotent les alertes calculées sur l&apos;accueil du Hub (et les défauts des outils de veille d&apos;Élio).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {FIELDS.map(({ key, label, hint }) => (
          <div key={key} className="rounded-xl border border-border bg-card/50 p-4 space-y-1.5">
            <label htmlFor={`threshold-${key}`} className="text-sm font-medium text-foreground block">
              {label}
            </label>
            <input
              id={`threshold-${key}`}
              type="number"
              min={1}
              max={365}
              step={1}
              value={values[key]}
              onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
            <p className="text-[11px] text-muted-foreground">{hint}</p>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving}
        className="rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white transition-colors"
      >
        {isSaving ? 'Sauvegarde...' : 'Enregistrer les seuils'}
      </button>
    </section>
  )
}

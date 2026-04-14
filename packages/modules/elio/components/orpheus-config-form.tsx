'use client'

import { useState, useTransition } from 'react'
import { Button, Input, Textarea, showSuccess, showError } from '@monprojetpro/ui'
import { ElioModelSelector } from './elio-model-selector'
import { ElioTemperatureSlider } from './elio-temperature-slider'
import { ElioFeatureToggles } from './elio-feature-toggles'
import { updateElioConfig } from '../actions/update-elio-config'
import { resetElioConfig } from '../actions/reset-elio-config'
import { type ElioConfig, type ElioModel, DEFAULT_ELIO_CONFIG } from '../types/elio-config.types'

interface OrpheusConfigFormProps {
  initialConfig: ElioConfig | null
}

export function OrpheusConfigForm({ initialConfig }: OrpheusConfigFormProps) {
  const config = initialConfig ?? DEFAULT_ELIO_CONFIG

  const [model, setModel] = useState<ElioModel>(config.model)
  const [temperature, setTemperature] = useState(config.temperature)
  const [maxTokens, setMaxTokens] = useState(config.maxTokens)
  const [customInstructions, setCustomInstructions] = useState(config.customInstructions ?? '')
  const [enabledFeatures, setEnabledFeatures] = useState(config.enabledFeatures)
  const [maxTokensError, setMaxTokensError] = useState<string | null>(null)

  const [isPending, startTransition] = useTransition()
  const [isResetting, startResetTransition] = useTransition()

  const validateMaxTokens = (value: number): boolean => {
    if (value < 100 || value > 8000) {
      setMaxTokensError('Max tokens doit être entre 100 et 8000')
      return false
    }
    setMaxTokensError(null)
    return true
  }

  const handleMaxTokensChange = (raw: string) => {
    const parsed = parseInt(raw, 10)
    if (!isNaN(parsed)) {
      setMaxTokens(parsed)
      validateMaxTokens(parsed)
    }
  }

  const handleSave = () => {
    if (!validateMaxTokens(maxTokens)) return

    startTransition(async () => {
      const result = await updateElioConfig({
        model,
        temperature,
        maxTokens,
        customInstructions: customInstructions || undefined,
        enabledFeatures,
      })

      if (result.error) {
        showError('Impossible d\'enregistrer la configuration. Veuillez réessayer.')
        return
      }

      showSuccess('Configuration Orpheus enregistrée.')
    })
  }

  const handleReset = () => {
    if (!confirm('Réinitialiser tous les paramètres aux valeurs par défaut ?')) return

    startResetTransition(async () => {
      const result = await resetElioConfig()

      if (result.error) {
        showError('Impossible de réinitialiser la configuration.')
        return
      }

      setModel(DEFAULT_ELIO_CONFIG.model)
      setTemperature(DEFAULT_ELIO_CONFIG.temperature)
      setMaxTokens(DEFAULT_ELIO_CONFIG.maxTokens)
      setCustomInstructions('')
      setEnabledFeatures(DEFAULT_ELIO_CONFIG.enabledFeatures)
      setMaxTokensError(null)
      showSuccess('Configuration réinitialisée aux valeurs par défaut.')
    })
  }

  const isDisabled = isPending || isResetting

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-6">
      {/* Modèle */}
      <ElioModelSelector value={model} onChange={setModel} disabled={isDisabled} />

      {/* Température */}
      <ElioTemperatureSlider value={temperature} onChange={setTemperature} disabled={isDisabled} />

      {/* Max tokens */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Max tokens</label>
        <p className="text-xs text-muted-foreground">
          Nombre maximum de tokens par réponse (100–8000).
        </p>
        <Input
          type="number"
          value={maxTokens}
          onChange={(e) => handleMaxTokensChange(e.target.value)}
          min={100}
          max={8000}
          disabled={isDisabled}
        />
        {maxTokensError && (
          <p className="text-xs text-destructive">{maxTokensError}</p>
        )}
      </div>

      {/* Instructions personnalisées */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          Instructions personnalisées{' '}
          <span className="font-normal text-muted-foreground">(optionnel)</span>
        </label>
        <p className="text-xs text-muted-foreground">
          Ajoutez des directives spécifiques injectées dans chaque prompt système d&apos;Élio.
        </p>
        <Textarea
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
          rows={4}
          placeholder="Ex: Utilise toujours des analogies avec le cinéma pour expliquer des concepts..."
          disabled={isDisabled}
        />
      </div>

      {/* Fonctionnalités */}
      <ElioFeatureToggles
        value={enabledFeatures}
        onChange={setEnabledFeatures}
        disabled={isDisabled}
      />

      {/* Actions */}
      <div className="flex justify-between border-t border-border pt-4">
        <Button
          type="button"
          variant="destructive"
          onClick={handleReset}
          disabled={isDisabled}
        >
          {isResetting ? 'Réinitialisation...' : 'Réinitialiser'}
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={isDisabled}
        >
          {isPending ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>
    </div>
  )
}

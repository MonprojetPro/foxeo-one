'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Input, Textarea, showSuccess, showError } from '@monprojetpro/ui'
import { getStepElioConfig } from '../actions/get-step-elio-config'
import { upsertStepElioConfig } from '../actions/upsert-step-elio-config'
import type { UpsertElioStepConfigInput } from '../types/parcours.types'
import {
  ALLOWED_ELIO_MODELS,
  DEFAULT_ELIO_MODEL,
  DEFAULT_ELIO_TEMPERATURE,
  DEFAULT_ELIO_MAX_TOKENS,
} from '../types/parcours.types'

const MODEL_LABELS: Record<typeof ALLOWED_ELIO_MODELS[number], string> = {
  'claude-haiku-4-5-20251001': 'Haiku (rapide)',
  'claude-sonnet-4-6': 'Sonnet (équilibré)',
  'claude-opus-4-6': 'Opus (expert)',
}

interface StepElioConfigPanelProps {
  stepId: string
  stepTitle: string
  stepNumber: number
  onClose: () => void
}

interface FormState {
  personaName: string
  personaDescription: string
  systemPromptOverride: string
  model: typeof ALLOWED_ELIO_MODELS[number]
  temperature: number
  maxTokens: number
  customInstructions: string
}

const DEFAULT_FORM: FormState = {
  personaName: 'Élio',
  personaDescription: '',
  systemPromptOverride: '',
  model: DEFAULT_ELIO_MODEL,
  temperature: DEFAULT_ELIO_TEMPERATURE,
  maxTokens: DEFAULT_ELIO_MAX_TOKENS,
  customInstructions: '',
}

export function StepElioConfigPanel({ stepId, stepTitle, stepNumber, onClose }: StepElioConfigPanelProps) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const { isLoading, error: loadError } = useQuery({
    queryKey: ['elio-step-config', stepId],
    queryFn: async () => {
      const result = await getStepElioConfig({ stepId })
      if (result.error) throw new Error(result.error.message)
      return result.data
    },
    staleTime: 2 * 60 * 1_000,
    onSuccess: (data) => {
      if (form === null) {
        setForm(
          data
            ? {
                personaName: data.personaName,
                personaDescription: data.personaDescription ?? '',
                systemPromptOverride: data.systemPromptOverride ?? '',
                model: (ALLOWED_ELIO_MODELS as readonly string[]).includes(data.model)
                  ? (data.model as typeof ALLOWED_ELIO_MODELS[number])
                  : DEFAULT_ELIO_MODEL,
                temperature: data.temperature,
                maxTokens: data.maxTokens,
                customInstructions: data.customInstructions ?? '',
              }
            : DEFAULT_FORM
        )
      }
    },
  } as Parameters<typeof useQuery>[0])

  const currentForm = form ?? DEFAULT_FORM

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...(prev ?? DEFAULT_FORM), [key]: value }))
  }

  async function handleSave() {
    setIsSaving(true)
    const input: UpsertElioStepConfigInput = {
      stepId,
      personaName: currentForm.personaName,
      personaDescription: currentForm.personaDescription || null,
      systemPromptOverride: currentForm.systemPromptOverride || null,
      model: currentForm.model,
      temperature: currentForm.temperature,
      maxTokens: currentForm.maxTokens,
      customInstructions: currentForm.customInstructions || null,
    }

    const result = await upsertStepElioConfig(input)

    if (result.error) {
      showError(result.error.message)
    } else {
      showSuccess('Configuration Élio sauvegardée')
      queryClient.invalidateQueries({ queryKey: ['elio-step-config', stepId] })
      onClose()
    }
    setIsSaving(false)
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-6" role="status" aria-label="Chargement de la configuration">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Impossible de charger la configuration : {(loadError as Error).message}
        </div>
        <Button variant="outline" className="mt-4" onClick={onClose}>
          Fermer
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h3 className="text-base font-semibold text-foreground">
          Configurer Élio — Étape {stepNumber}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">{stepTitle}</p>
      </div>

      {/* Persona */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Persona
        </legend>

        <div className="space-y-1.5">
          <label htmlFor="personaName" className="text-sm font-medium">
            Nom du persona <span aria-hidden="true" className="text-destructive">*</span>
          </label>
          <Input
            id="personaName"
            value={currentForm.personaName}
            onChange={e => updateField('personaName', e.target.value)}
            placeholder="Élio"
            maxLength={100}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="personaDescription" className="text-sm font-medium">
            Description du persona
          </label>
          <Textarea
            id="personaDescription"
            value={currentForm.personaDescription}
            onChange={e => updateField('personaDescription', e.target.value)}
            placeholder="Expert en identité visuelle de marque…"
            rows={2}
            maxLength={500}
          />
        </div>
      </fieldset>

      {/* System Prompt */}
      <div className="space-y-1.5">
        <label htmlFor="systemPromptOverride" className="text-sm font-medium">
          System prompt personnalisé
        </label>
        <Textarea
          id="systemPromptOverride"
          value={currentForm.systemPromptOverride}
          onChange={e => updateField('systemPromptOverride', e.target.value)}
          placeholder="Tu es un expert en…"
          rows={4}
          maxLength={4000}
        />
        <p className="text-xs text-muted-foreground">
          Laissez vide pour utiliser le prompt global d'Élio.
        </p>
      </div>

      {/* Modèle */}
      <div className="space-y-1.5">
        <p className="text-sm font-medium">Modèle</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Choisir le modèle">
          {ALLOWED_ELIO_MODELS.map(m => (
            <button
              key={m}
              type="button"
              onClick={() => updateField('model', m)}
              className={[
                'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                currentForm.model === m
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-transparent text-foreground border-border hover:border-primary/50',
              ].join(' ')}
              aria-pressed={currentForm.model === m}
            >
              {MODEL_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      {/* Température */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="temperature" className="text-sm font-medium">Température</label>
          <span className="text-sm font-mono text-muted-foreground">{currentForm.temperature.toFixed(1)}</span>
        </div>
        <input
          id="temperature"
          type="range"
          min={0}
          max={2}
          step={0.1}
          value={currentForm.temperature}
          onChange={e => updateField('temperature', parseFloat(e.target.value))}
          className="w-full accent-primary"
          aria-label="Température de génération"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Précis (0)</span>
          <span>Créatif (2)</span>
        </div>
      </div>

      {/* Max Tokens */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="maxTokens" className="text-sm font-medium">Tokens max</label>
          <span className="text-sm font-mono text-muted-foreground">{currentForm.maxTokens}</span>
        </div>
        <input
          id="maxTokens"
          type="range"
          min={100}
          max={8000}
          step={100}
          value={currentForm.maxTokens}
          onChange={e => updateField('maxTokens', parseInt(e.target.value, 10))}
          className="w-full accent-primary"
          aria-label="Nombre maximum de tokens"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>100</span>
          <span>8 000</span>
        </div>
      </div>

      {/* Instructions custom */}
      <div className="space-y-1.5">
        <label htmlFor="customInstructions" className="text-sm font-medium">
          Instructions supplémentaires
        </label>
        <Textarea
          id="customInstructions"
          value={currentForm.customInstructions}
          onChange={e => updateField('customInstructions', e.target.value)}
          placeholder="Toujours utiliser des exemples concrets…"
          rows={3}
          maxLength={2000}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={onClose} disabled={isSaving}>
          Annuler
        </Button>
        <Button onClick={handleSave} disabled={isSaving || !currentForm.personaName.trim()}>
          {isSaving ? 'Sauvegarde…' : 'Sauvegarder'}
        </Button>
      </div>
    </div>
  )
}

'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@monprojetpro/ui'
import { ELIO_MODELS, type ElioModel } from '../types/elio-config.types'

const MODEL_LABELS: Record<ElioModel, { label: string; description: string }> = {
  'claude-haiku-4-20250122': {
    label: 'Haiku 4',
    description: 'Rapide & économique',
  },
  'claude-sonnet-4-20250514': {
    label: 'Sonnet 4',
    description: 'Équilibré — Recommandé',
  },
  'claude-opus-4-20250514': {
    label: 'Opus 4',
    description: 'Puissant & plus lent',
  },
}

interface ElioModelSelectorProps {
  value: ElioModel
  onChange: (value: ElioModel) => void
  disabled?: boolean
}

export function ElioModelSelector({ value, onChange, disabled }: ElioModelSelectorProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">Modèle Claude</label>
      <p className="text-xs text-muted-foreground">
        Choisissez le modèle utilisé par Élio pour générer ses réponses.
      </p>
      <Select value={value} onValueChange={(v) => onChange(v as ElioModel)} disabled={disabled}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ELIO_MODELS.map((model) => (
            <SelectItem key={model} value={model}>
              <span className="font-medium">{MODEL_LABELS[model].label}</span>
              <span className="ml-1 text-muted-foreground">— {MODEL_LABELS[model].description}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

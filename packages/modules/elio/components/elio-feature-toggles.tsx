'use client'

import { Switch } from '@monprojetpro/ui'

const AVAILABLE_FEATURES: Array<{ key: string; label: string; description: string }> = [
  {
    key: 'code_generation',
    label: 'Génération de code',
    description: 'Élio peut générer et expliquer du code',
  },
  {
    key: 'web_search',
    label: 'Recherche web',
    description: 'Élio peut référencer des sources en ligne',
  },
]

interface ElioFeatureTogglesProps {
  value: Record<string, boolean>
  onChange: (value: Record<string, boolean>) => void
  disabled?: boolean
}

export function ElioFeatureToggles({ value, onChange, disabled }: ElioFeatureTogglesProps) {
  const handleToggle = (key: string, checked: boolean) => {
    onChange({ ...value, [key]: checked })
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">Fonctionnalités</label>
      <p className="text-xs text-muted-foreground">
        Activez ou désactivez des capacités spécifiques d&apos;Élio.
      </p>
      <div className="space-y-3 pt-1">
        {AVAILABLE_FEATURES.map((feature) => (
          <div key={feature.key} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
            <div>
              <p className="text-sm font-medium text-foreground">{feature.label}</p>
              <p className="text-xs text-muted-foreground">{feature.description}</p>
            </div>
            <Switch
              checked={!!value[feature.key]}
              onCheckedChange={(checked) => handleToggle(feature.key, checked)}
              disabled={disabled}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

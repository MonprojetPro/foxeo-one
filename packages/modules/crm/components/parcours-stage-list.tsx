'use client'

import { Checkbox } from '@monprojetpro/ui'
import type { ParcoursStage } from '../types/crm.types'

interface StageToggle {
  key: string
  active: boolean
}

interface ParcoursStageListProps {
  stages: ParcoursStage[]
  activeStages: StageToggle[]
  onToggle: (key: string, active: boolean) => void
  readOnly?: boolean
}

export function ParcoursStageList({ stages, activeStages, onToggle, readOnly = false }: ParcoursStageListProps) {
  const getStageActive = (key: string): boolean => {
    return activeStages.find((s) => s.key === key)?.active ?? true
  }

  return (
    <div className="space-y-3" data-testid="parcours-stage-list">
      {stages.map((stage) => (
        /* Étape de parcours — carte cockpit sombre */
        <div
          key={stage.key}
          className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.04]"
          data-testid={`stage-${stage.key}`}
        >
          <Checkbox
            checked={getStageActive(stage.key)}
            onCheckedChange={(checked) => onToggle(stage.key, checked)}
            disabled={readOnly}
            aria-label={`Activer ${stage.name}`}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">{stage.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{stage.description}</p>
          </div>
          <span className="text-xs text-gray-500 shrink-0">
            Étape {stage.order}
          </span>
        </div>
      ))}
    </div>
  )
}

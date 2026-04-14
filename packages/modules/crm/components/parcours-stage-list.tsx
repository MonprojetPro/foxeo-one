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
        <div
          key={stage.key}
          className="flex items-start gap-3 rounded-md border p-3"
          data-testid={`stage-${stage.key}`}
        >
          <Checkbox
            checked={getStageActive(stage.key)}
            onCheckedChange={(checked) => onToggle(stage.key, checked)}
            disabled={readOnly}
            aria-label={`Activer ${stage.name}`}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{stage.name}</p>
            <p className="text-xs text-muted-foreground">{stage.description}</p>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            Étape {stage.order}
          </span>
        </div>
      ))}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Button } from '@monprojetpro/ui'
import { GeneratedBriefDialog } from './generated-brief-dialog'

interface ElioGenerateBriefSectionProps {
  stepId: string
}

export function ElioGenerateBriefSection({ stepId }: ElioGenerateBriefSectionProps) {
  const [showDialog, setShowDialog] = useState(false)

  return (
    <>
      <div className="rounded-lg border border-purple-600/30 bg-purple-950/20 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <div>
            <p className="text-sm font-semibold text-foreground">Générer mon brief avec Élio</p>
            <p className="text-xs text-muted-foreground">
              Élio analyse vos échanges et génère un brief professionnel que vous pourrez relire et éditer.
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowDialog(true)}
          className="w-full bg-purple-600 hover:bg-purple-500"
          size="sm"
        >
          ✨ Générer mon brief avec Élio
        </Button>
      </div>

      <GeneratedBriefDialog
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        stepId={stepId}
      />
    </>
  )
}

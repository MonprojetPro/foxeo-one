'use client'

import { CheckCircle, XCircle, HelpCircle, ChevronDown } from 'lucide-react'
import { Button } from '@monprojetpro/ui'
import type { ValidationRequestStatus } from '../types/validation.types'

type RequestActionsProps = {
  status: ValidationRequestStatus
  onValidate: () => void
  onRefuse: () => void
  onRequestClarification: () => void
  onTreatmentAction?: () => void
  treatmentActionSlot?: React.ReactNode
}

export function RequestActions({
  status,
  onValidate,
  onRefuse,
  onRequestClarification,
  onTreatmentAction,
  treatmentActionSlot,
}: RequestActionsProps) {
  // Buttons are disabled if status is not 'pending' or 'needs_clarification'
  const isEditable = status === 'pending' || status === 'needs_clarification'

  return (
    <div className="sticky bottom-0 z-10 border-t border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 p-4">
      <div className="flex flex-wrap gap-3 max-w-4xl">
        {/* Valider */}
        <Button
          onClick={onValidate}
          disabled={!isEditable}
          className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Valider
        </Button>

        {/* Refuser */}
        <Button
          onClick={onRefuse}
          disabled={!isEditable}
          className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
        >
          <XCircle className="h-4 w-4 mr-2" />
          Refuser
        </Button>

        {/* Demander des précisions */}
        <Button
          onClick={onRequestClarification}
          disabled={!isEditable}
          variant="outline"
          className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10 disabled:opacity-50"
        >
          <HelpCircle className="h-4 w-4 mr-2" />
          Demander des précisions
        </Button>

        {/* Actions de traitement (toujours actif sur 'approved') */}
        {treatmentActionSlot ?? (
          <Button
            onClick={onTreatmentAction}
            disabled={status === 'rejected'}
            variant="outline"
            className="border-border text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            Actions de traitement
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  )
}

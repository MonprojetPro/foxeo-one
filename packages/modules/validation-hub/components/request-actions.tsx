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
  // Boutons désactivés si la demande n'est plus en cours de traitement
  const isEditable = status === 'pending' || status === 'needs_clarification'

  return (
    /* Barre sticky cockpit — fond verre sombre, bordure fine, backdrop-blur */
    <div className="sticky bottom-0 z-10 border-t border-white/10 bg-black/80 p-4 backdrop-blur supports-[backdrop-filter]:bg-black/60">
      <div className="flex flex-wrap items-center gap-3 max-w-4xl">
        {/* ── Valider ───────────────────────────────────────────────────────── */}
        <Button
          onClick={onValidate}
          disabled={!isEditable}
          className="border border-emerald-500/40 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-40"
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Valider
        </Button>

        {/* ── Refuser ───────────────────────────────────────────────────────── */}
        <Button
          onClick={onRefuse}
          disabled={!isEditable}
          className="border border-red-500/40 bg-red-500/20 text-red-200 hover:bg-red-500/30 disabled:opacity-40"
        >
          <XCircle className="mr-2 h-4 w-4" />
          Refuser
        </Button>

        {/* ── Demander des précisions ───────────────────────────────────────── */}
        <Button
          onClick={onRequestClarification}
          disabled={!isEditable}
          variant="outline"
          className="border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 hover:border-blue-500/50 disabled:opacity-40"
        >
          <HelpCircle className="mr-2 h-4 w-4" />
          Demander des précisions
        </Button>

        {/* ── Actions de traitement (actif même sur 'approved') ─────────────── */}
        {treatmentActionSlot ?? (
          <Button
            onClick={onTreatmentAction}
            disabled={status === 'rejected'}
            variant="outline"
            className="border-white/10 bg-white/[0.02] text-gray-400 hover:border-white/20 hover:text-gray-200 disabled:opacity-40"
          >
            Actions de traitement
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

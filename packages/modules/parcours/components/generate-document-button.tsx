'use client'

import { useState, useCallback } from 'react'
import { showSuccess, showError } from '@monprojetpro/ui'
import { generateDocumentFromConversation } from '../actions/generate-and-submit-step'
import { submitGeneratedDocument } from '../actions/submit-generated-document'
import { useStepSubmissionStatus } from '../hooks/use-step-submission-status'
import { BriefMarkdownRenderer } from './brief-markdown-renderer'
import type { ParcoursStepStatus } from '../types/parcours.types'

interface GenerateDocumentButtonProps {
  stepId: string
  stepStatus: ParcoursStepStatus
  clientId: string
  messageCount: number
  stepNumber: number
  onSubmitted?: () => void
}

type ButtonState = 'idle' | 'confirmation' | 'loading' | 'preview' | 'submitting' | 'submitted'

const MIN_MESSAGES = 3

function TooltipWrapper({ message, children }: { message: string; children: React.ReactNode }) {
  return (
    <div className="relative group inline-block w-full">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-[#3d3d3d] text-xs text-[#9ca3af] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        {message}
      </div>
    </div>
  )
}

export function GenerateDocumentButton({
  stepId,
  stepStatus,
  clientId,
  messageCount,
  stepNumber,
  onSubmitted,
}: GenerateDocumentButtonProps) {
  const [buttonState, setButtonState] = useState<ButtonState>('idle')
  const [generatedDocument, setGeneratedDocument] = useState<string>('')

  const { hasPending, isLoading: pendingLoading } = useStepSubmissionStatus(stepId)

  // Conditions pour activer le bouton
  const hasEnoughMessages = messageCount >= MIN_MESSAGES
  const isStepCurrent = stepStatus === 'current'
  const isEnabled = isStepCurrent && hasEnoughMessages && !hasPending && !pendingLoading

  function getDisabledTooltip(): string {
    if (!isStepCurrent) return 'Étape non accessible'
    if (hasPending) return 'Soumission en attente de validation'
    if (!hasEnoughMessages) return `Minimum ${MIN_MESSAGES} échanges avec Élio`
    return ''
  }

  const handleGenerate = useCallback(async () => {
    setButtonState('loading')
    const result = await generateDocumentFromConversation({ stepId, clientId })
    if (result.error || !result.data) {
      showError(result.error?.message ?? 'Erreur lors de la génération')
      setButtonState('confirmation')
      return
    }
    setGeneratedDocument(result.data.document)
    setButtonState('preview')
  }, [stepId, clientId])

  const handleSubmit = useCallback(async () => {
    setButtonState('submitting')
    const result = await submitGeneratedDocument({ stepId, document: generatedDocument })
    if (result.error || !result.data) {
      showError(result.error?.message ?? 'Erreur lors de la soumission')
      setButtonState('preview')
      return
    }
    showSuccess('Votre document a été soumis à MiKL !')
    setButtonState('submitted')
    onSubmitted?.()
  }, [stepId, generatedDocument, onSubmitted])

  // ─── État: chargement en attente de la vérification ───────────────────────
  if (pendingLoading) {
    return (
      <div className="mt-4 h-12 rounded-xl bg-[#1a1a1a] border border-[#2d2d2d] animate-pulse" />
    )
  }

  // ─── Déjà soumis (session ou DB pending_review) ───────────────────────────
  if (buttonState === 'submitted' || hasPending) {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#2d2d2d] bg-[#0f0f0f] px-4 py-3">
        <span className="w-2 h-2 rounded-full bg-[#f59e0b] animate-pulse shrink-0" aria-hidden="true" />
        <span className="text-sm text-[#d97706] font-medium">Soumission en cours d'examen…</span>
      </div>
    )
  }

  // ─── État: confirmation ───────────────────────────────────────────────────
  if (buttonState === 'confirmation') {
    return (
      <div className="mt-4 rounded-xl border border-[#7c3aed]/40 bg-[#1e1557]/60 p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#a78bfa] flex items-center justify-center text-white font-bold text-[11px] shrink-0">
            E
          </div>
          <p className="text-sm text-[#e5e7eb] leading-relaxed">
            Es-tu sûr d'avoir bien cerné le sujet ? Tu penses être prêt à soumettre ton document à MiKL ?
          </p>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => setButtonState('idle')}
            className="px-4 py-2 rounded-lg border border-[#2d2d2d] text-sm text-[#9ca3af] hover:text-[#f9fafb] hover:border-[#4d4d4d] transition-colors"
          >
            Non, continuer
          </button>
          <button
            onClick={handleGenerate}
            className="px-4 py-2 rounded-lg bg-[#7c3aed] hover:bg-[#8b4df0] text-sm text-white font-semibold transition-colors"
          >
            Oui, je suis prêt
          </button>
        </div>
      </div>
    )
  }

  // ─── État: génération en cours ────────────────────────────────────────────
  if (buttonState === 'loading') {
    return (
      <div className="mt-4 rounded-xl border border-[#2d2d2d] bg-[#0f0f0f] px-4 py-5 flex items-center gap-3">
        <div className="flex gap-1" aria-hidden="true">
          <span className="w-2 h-2 rounded-full bg-[#a78bfa] animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-[#a78bfa] animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-[#a78bfa] animate-bounce [animation-delay:300ms]" />
        </div>
        <span className="text-sm text-[#9ca3af]">Élio rédige votre document…</span>
      </div>
    )
  }

  // ─── État: aperçu du document ─────────────────────────────────────────────
  if (buttonState === 'preview') {
    return (
      <div className="mt-4 rounded-xl border border-[#7c3aed]/40 bg-[#0f0f0f] overflow-hidden">
        <div className="px-4 py-3 bg-[#1a1033] border-b border-[#2d2d2d] flex items-center justify-between">
          <span className="text-sm font-semibold text-[#a78bfa]">Aperçu de votre document</span>
          <span className="text-xs text-[#6b7280]">Étape {stepNumber}</span>
        </div>
        <div className="max-h-[400px] overflow-y-auto p-5">
          <BriefMarkdownRenderer content={generatedDocument} />
        </div>
        <div className="px-4 py-3 border-t border-[#2d2d2d] flex gap-2 justify-between">
          <button
            onClick={() => setButtonState('idle')}
            className="px-4 py-2 rounded-lg border border-[#2d2d2d] text-sm text-[#9ca3af] hover:text-[#f9fafb] transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2 rounded-lg bg-[#7c3aed] hover:bg-[#8b4df0] text-sm text-white font-semibold transition-colors disabled:opacity-50"
            disabled={buttonState === 'submitting'}
          >
            Confirmer l'envoi
          </button>
        </div>
      </div>
    )
  }

  // ─── État: soumission en cours ────────────────────────────────────────────
  if (buttonState === 'submitting') {
    return (
      <div className="mt-4 rounded-xl border border-[#2d2d2d] bg-[#0f0f0f] px-4 py-3 text-sm text-[#9ca3af]">
        Envoi en cours…
      </div>
    )
  }

  // ─── État: idle (bouton principal) ────────────────────────────────────────
  const disabledTooltip = getDisabledTooltip()

  return (
    <div className="mt-4">
      {isEnabled ? (
        <button
          onClick={() => setButtonState('confirmation')}
          className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] hover:from-[#8b4df0] hover:to-[#7c3aed] text-white text-sm font-semibold transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)]"
          aria-label={`Générer mon document pour l'étape ${stepNumber}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14,2 14,8 20,8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          Générer mon document
        </button>
      ) : (
        <TooltipWrapper message={disabledTooltip}>
          <button
            disabled
            className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-[#1a1a1a] border border-[#2d2d2d] text-[#6b7280] text-sm font-semibold cursor-not-allowed"
            aria-label={`Générer mon document — ${disabledTooltip}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14,2 14,8 20,8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            Générer mon document
          </button>
        </TooltipWrapper>
      )}
    </div>
  )
}

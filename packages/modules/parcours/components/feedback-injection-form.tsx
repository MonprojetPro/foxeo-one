'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Textarea, showSuccess, showError } from '@monprojetpro/ui'
import { createFeedbackInjection } from '../actions/create-feedback-injection'
import type { FeedbackInjectionType } from '../types/parcours.types'

interface FeedbackInjectionFormProps {
  stepId: string
  clientId: string
  stepNumber?: number
  onSuccess?: () => void
}

const TYPE_OPTIONS: Array<{ value: FeedbackInjectionType; label: string; description: string }> = [
  {
    value: 'text_feedback',
    label: 'Feedback texte',
    description: 'Visible dans l\'historique de l\'étape',
  },
  {
    value: 'elio_questions',
    label: 'Injecter questions dans Élio',
    description: 'Les questions apparaissent dans le chat Élio du client',
  },
]

export function FeedbackInjectionForm({
  stepId,
  clientId,
  stepNumber,
  onSuccess,
}: FeedbackInjectionFormProps) {
  const [type, setType] = useState<FeedbackInjectionType>('text_feedback')
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const queryClient = useQueryClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || isSubmitting) return

    setIsSubmitting(true)
    const result = await createFeedbackInjection({ stepId, clientId, content: content.trim(), type })
    setIsSubmitting(false)

    if (result.error) {
      showError(result.error.message)
      return
    }

    showSuccess(
      type === 'elio_questions'
        ? 'Questions injectées dans le chat Élio du client'
        : 'Feedback envoyé au client'
    )
    setContent('')

    // Invalider le cache des injections non lues
    queryClient.invalidateQueries({ queryKey: ['unread-injections', clientId] })
    onSuccess?.()
  }

  const stepLabel = stepNumber ? `Étape ${stepNumber}` : 'cette étape'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="text-sm font-medium text-[#f9fafb] mb-3">
          Type de message pour {stepLabel}
        </p>
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Type d'injection">
          {TYPE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                type === option.value
                  ? 'border-[#7c3aed] bg-[#1e1557]'
                  : 'border-[#2d2d2d] bg-[#141414] hover:border-[#3d2d6d]'
              }`}
            >
              <input
                type="radio"
                name="injection-type"
                value={option.value}
                checked={type === option.value}
                onChange={() => setType(option.value)}
                className="mt-0.5 accent-[#7c3aed]"
                aria-label={option.label}
              />
              <div>
                <span className="text-sm font-medium text-[#f9fafb] block">{option.label}</span>
                <span className="text-xs text-[#9ca3af]">{option.description}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label
          htmlFor="injection-content"
          className="block text-sm font-medium text-[#f9fafb] mb-2"
        >
          {type === 'elio_questions' ? 'Questions à injecter' : 'Feedback'}
          <span className="text-[#ef4444] ml-1" aria-hidden="true">*</span>
        </label>
        <Textarea
          id="injection-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          placeholder={
            type === 'elio_questions'
              ? 'Quels sont vos 3 clients idéaux ?\nQuelle est votre proposition de valeur unique ?'
              : 'Votre retour sur le travail du client...'
          }
          className="w-full"
          maxLength={4000}
          aria-required="true"
        />
        <p className="mt-1 text-xs text-[#6b7280] text-right">
          {content.length}/4000
        </p>
      </div>

      <Button
        type="submit"
        disabled={isSubmitting || !content.trim()}
        className="w-full"
      >
        {isSubmitting
          ? 'Envoi en cours…'
          : type === 'elio_questions'
            ? 'Injecter dans Élio'
            : 'Envoyer le feedback'}
      </Button>
    </form>
  )
}

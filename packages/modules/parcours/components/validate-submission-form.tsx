'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Textarea, Separator, showSuccess, showError } from '@monprojetpro/ui'
import { validateSubmission } from '../actions/validate-submission'
import type { ValidateDecision } from '../types/parcours.types'

const schema = z.object({
  decision: z.enum(['approved', 'rejected', 'revision_requested'] as const),
  feedback: z.string().optional(),
}).refine(
  (data) => data.decision === 'approved' || (data.feedback && data.feedback.length > 0),
  { message: 'Le feedback est obligatoire pour une révision ou un refus', path: ['feedback'] }
)

type FormData = z.infer<typeof schema>

interface ValidateSubmissionFormProps {
  submissionId: string
  clientId: string
}

const decisionLabels: Record<ValidateDecision, string> = {
  approved: 'Approuver',
  revision_requested: 'Demander une révision',
  rejected: 'Refuser',
}

const decisionVariants: Record<ValidateDecision, 'default' | 'outline' | 'destructive'> = {
  approved: 'default',
  revision_requested: 'outline',
  rejected: 'destructive',
}

export function ValidateSubmissionForm({ submissionId, clientId }: ValidateSubmissionFormProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { decision: 'approved', feedback: '' },
  })

  const decision = watch('decision')
  const requiresFeedback = decision === 'revision_requested' || decision === 'rejected'

  const onSubmit = async (data: FormData) => {
    const response = await validateSubmission({
      submissionId,
      decision: data.decision,
      feedback: data.feedback || undefined,
    })

    if (response.error) {
      showError(response.error.message)
      return
    }

    // Invalider le cache des soumissions pour ce client
    await queryClient.invalidateQueries({ queryKey: ['step-submissions', undefined, clientId] })

    showSuccess(`Soumission ${decisionLabels[data.decision].toLowerCase()} avec succès.`)
    router.push(`/modules/crm/clients/${clientId}`)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <p className="text-sm font-medium mb-3">Décision</p>
        <div className="flex gap-3" role="group" aria-label="Choisir une décision">
          {(['approved', 'revision_requested', 'rejected'] as ValidateDecision[]).map((d) => (
            <Button
              key={d}
              type="button"
              variant={decision === d ? decisionVariants[d] : 'outline'}
              onClick={() => setValue('decision', d)}
              aria-pressed={decision === d}
            >
              {decisionLabels[d]}
            </Button>
          ))}
        </div>
      </div>

      {requiresFeedback && (
        <div>
          <label htmlFor="validation-feedback" className="block text-sm font-medium mb-2">
            Commentaire <span className="text-destructive" aria-hidden="true">*</span>
          </label>
          <Textarea
            id="validation-feedback"
            {...register('feedback')}
            rows={5}
            placeholder="Expliquez votre décision au client..."
            className="w-full"
            aria-describedby={errors.feedback ? 'feedback-error' : undefined}
          />
          {errors.feedback && (
            <p id="feedback-error" className="mt-1 text-sm text-destructive" role="alert">
              {errors.feedback.message}
            </p>
          )}
        </div>
      )}

      <Separator />

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Envoi en cours...' : `Confirmer — ${decisionLabels[decision]}`}
      </Button>
    </form>
  )
}

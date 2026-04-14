'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Textarea,
  showSuccess,
  showError,
} from '@monprojetpro/ui'
import { requestClarification } from '../actions/request-clarification'
import type { ValidationRequestType } from '../types/validation.types'

const QUICK_SUGGESTIONS = [
  'Pouvez-vous détailler le besoin ?',
  'Avez-vous un exemple concret ?',
  'Quel est le budget envisagé ?',
] as const

const clarificationSchema = z.object({
  comment: z
    .string()
    .min(10, 'Le commentaire doit contenir au moins 10 caractères')
    .max(1000, 'Le commentaire ne doit pas dépasser 1000 caractères'),
})

type ClarificationFormData = z.infer<typeof clarificationSchema>

type ClarificationDialogProps = {
  open: boolean
  onClose: () => void
  requestId: string
  title: string
  clientName: string
  type: ValidationRequestType
}

export function ClarificationDialog({
  open,
  onClose,
  requestId,
  title,
  clientName,
}: ClarificationDialogProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    setValue,
  } = useForm<ClarificationFormData>({
    resolver: zodResolver(clarificationSchema),
    mode: 'onChange',
  })

  function handleClose() {
    if (isPending) return
    reset()
    onClose()
  }

  function handleSuggestionClick(suggestion: string) {
    setValue('comment', suggestion, { shouldValidate: true })
  }

  function onSubmit(data: ClarificationFormData) {
    startTransition(async () => {
      const result = await requestClarification(requestId, data.comment)

      if (result.error) {
        showError("Erreur lors de l'envoi — veuillez réessayer")
        return
      }

      showSuccess('Question envoyée au client')

      await queryClient.invalidateQueries({ queryKey: ['validation-requests'] })
      await queryClient.invalidateQueries({ queryKey: ['validation-request', requestId] })

      reset()
      onClose()
      router.push('/modules/validation-hub')
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Demander des précisions</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            {/* Résumé de la demande */}
            <div className="rounded-md bg-muted/30 p-3 text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Demande :</span>{' '}
                <strong className="text-foreground">{title}</strong>
              </p>
              <p>
                <span className="text-muted-foreground">Client :</span>{' '}
                <span className="text-foreground">{clientName}</span>
              </p>
            </div>

            {/* Champ question obligatoire */}
            <div className="space-y-2">
              <label htmlFor="clarification-comment" className="text-sm font-medium text-foreground">
                Quelle information vous manque ? <span className="text-red-400">*</span>
              </label>
              <Textarea
                id="clarification-comment"
                placeholder="Quelle information vous manque ?"
                {...register('comment')}
                disabled={isPending}
                className={`resize-none ${errors.comment ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                rows={4}
              />
              {errors.comment && (
                <p className="text-xs text-red-500">{errors.comment.message}</p>
              )}
            </div>

            {/* Suggestions rapides */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Suggestions rapides :</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_SUGGESTIONS.map((suggestion) => (
                  <Button
                    key={suggestion}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuggestionClick(suggestion)}
                    disabled={isPending}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={!isValid || isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            >
              {isPending ? 'Envoi en cours...' : 'Envoyer la question'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

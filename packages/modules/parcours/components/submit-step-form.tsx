'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Button, Textarea, showSuccess, showError } from '@monprojetpro/ui'
import { SubmissionFileUpload } from './submission-file-upload'
import { submitStep } from '../actions/submit-step'

const schema = z.object({
  content: z.string().min(50, 'Votre soumission doit contenir au moins 50 caractères'),
})

type FormData = z.infer<typeof schema>

interface SubmitStepFormProps {
  stepId: string
}

export function SubmitStepForm({ stepId }: SubmitStepFormProps) {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  // Files are managed outside RHF (controlled separately)
  let selectedFiles: File[] = []

  const onSubmit = async (data: FormData) => {
    const response = await submitStep({
      stepId,
      content: data.content,
      files: selectedFiles.length > 0 ? selectedFiles : undefined,
    })

    if (response.error) {
      showError(response.error.message)
      return
    }

    showSuccess('Soumission envoyée — MiKL va valider votre travail.')
    router.push('/modules/parcours')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label htmlFor="submission-content" className="block text-sm font-medium mb-2">
          Votre travail <span className="text-destructive" aria-hidden="true">*</span>
        </label>
        <Textarea
          id="submission-content"
          {...register('content')}
          rows={10}
          placeholder="Décrivez ce que vous avez réalisé pour cette étape..."
          className="w-full"
          aria-describedby={errors.content ? 'content-error' : undefined}
        />
        {errors.content && (
          <p id="content-error" className="mt-1 text-sm text-destructive" role="alert">
            {errors.content.message}
          </p>
        )}
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Fichiers joints (optionnel)</p>
        <SubmissionFileUpload
          onFilesChange={(files) => {
            selectedFiles = files
          }}
          maxFiles={5}
        />
      </div>

      <Button type="submit" disabled={isSubmitting} size="lg" className="w-full">
        {isSubmitting ? 'Envoi en cours...' : 'Soumettre pour validation'}
      </Button>
    </form>
  )
}

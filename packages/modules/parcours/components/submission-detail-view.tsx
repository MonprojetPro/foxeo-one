'use client'

import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { FileText, Image, ExternalLink } from 'lucide-react'
import { Separator, Skeleton } from '@monprojetpro/ui'
import { getSubmissionById } from '../actions/get-submission-by-id'
import { SubmissionStatusBadge } from './submission-status-badge'
import { ValidateSubmissionForm } from './validate-submission-form'
import type { StepSubmissionWithStep } from '../types/parcours.types'

interface SubmissionDetailViewProps {
  submissionId: string
  clientId: string
  showValidationForm?: boolean
}

function FilePreviewItem({ path }: { path: string }) {
  const isImage = /\.(png|jpg|jpeg)$/i.test(path)
  const Icon = isImage ? Image : FileText
  const filename = path.split('/').pop() ?? path

  return (
    <li className="flex items-center gap-2 text-sm">
      <Icon className="w-4 h-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="flex-1 truncate">{filename}</span>
      <a
        href={path}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={`Ouvrir ${filename}`}
      >
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </li>
  )
}

export function SubmissionDetailView({
  submissionId,
  clientId,
  showValidationForm = false,
}: SubmissionDetailViewProps) {
  const { data: submission, isLoading, error } = useQuery<StepSubmissionWithStep>({
    queryKey: ['submission', submissionId],
    queryFn: async () => {
      const { data, error } = await getSubmissionById(submissionId)
      if (error) throw new Error(error.message)
      if (!data) throw new Error('Soumission non trouvée')
      return data
    },
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <div className="space-y-4" aria-label="Chargement">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-6 w-32" />
      </div>
    )
  }

  if (error || !submission) {
    return (
      <p className="text-sm text-destructive" role="alert">
        Erreur lors du chargement de la soumission.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">
            Étape {submission.stepNumber} — {submission.stepTitle}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Soumis le {format(new Date(submission.submittedAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
          </p>
        </div>
        <SubmissionStatusBadge status={submission.status} />
      </div>

      <Separator />

      {/* Contenu */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-2">Travail soumis</h3>
        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{submission.submissionContent}</p>
        </div>
      </div>

      {/* Fichiers joints */}
      {submission.submissionFiles.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Fichiers joints ({submission.submissionFiles.length})
          </h3>
          <ul className="space-y-2">
            {submission.submissionFiles.map((path) => (
              <FilePreviewItem key={path} path={path} />
            ))}
          </ul>
        </div>
      )}

      {/* Feedback existant */}
      {submission.feedback && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Feedback MiKL</h3>
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-sm whitespace-pre-wrap">{submission.feedback}</p>
            {submission.feedbackAt && (
              <p className="text-xs text-muted-foreground mt-2">
                {format(new Date(submission.feedbackAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Formulaire de validation — seulement si pending et showValidationForm */}
      {showValidationForm && submission.status === 'pending' && (
        <>
          <Separator />
          <div>
            <h3 className="text-sm font-semibold mb-4">Valider cette soumission</h3>
            <ValidateSubmissionForm submissionId={submissionId} clientId={clientId} />
          </div>
        </>
      )}
    </div>
  )
}

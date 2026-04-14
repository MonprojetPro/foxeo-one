'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Eye } from 'lucide-react'
import { Button, Skeleton } from '@monprojetpro/ui'
import { useStepSubmissions } from '../hooks/use-step-submissions'
import { SubmissionStatusBadge } from './submission-status-badge'
import type { SubmissionStatus } from '../types/parcours.types'

interface SubmissionsListProps {
  clientId: string
  statusFilter?: SubmissionStatus
}

export function SubmissionsList({ clientId, statusFilter }: SubmissionsListProps) {
  const { data: submissions, isLoading, error } = useStepSubmissions({
    clientId,
    status: statusFilter,
  })

  if (isLoading) {
    return (
      <div className="space-y-3" aria-label="Chargement des soumissions">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <p className="text-sm text-destructive" role="alert">
        Erreur lors du chargement des soumissions.
      </p>
    )
  }

  if (!submissions || submissions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Aucune soumission pour ce client.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <table className="w-full text-sm" aria-label="Liste des soumissions">
        <thead>
          <tr className="text-left text-muted-foreground border-b border-border">
            <th className="pb-2 pr-4 font-medium">Étape</th>
            <th className="pb-2 pr-4 font-medium">Date</th>
            <th className="pb-2 pr-4 font-medium">Statut</th>
            <th className="pb-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {submissions.map((submission) => (
            <tr key={submission.id} className="py-3">
              <td className="py-3 pr-4 font-medium text-foreground">
                Étape {submission.stepNumber} — {submission.stepTitle}
              </td>
              <td className="py-3 pr-4 text-muted-foreground">
                {format(new Date(submission.submittedAt), 'dd MMM yyyy', { locale: fr })}
              </td>
              <td className="py-3 pr-4">
                <SubmissionStatusBadge status={submission.status} />
              </td>
              <td className="py-3">
                <Button asChild variant="ghost" size="sm">
                  <Link
                    href={`submissions/${submission.id}`}
                    aria-label={`Voir la soumission du ${format(new Date(submission.submittedAt), 'dd MMM yyyy', { locale: fr })}`}
                  >
                    <Eye className="w-4 h-4 mr-1" aria-hidden="true" />
                    Voir
                  </Link>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

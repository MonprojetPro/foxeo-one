'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Eye, AlertCircle } from 'lucide-react'
import { Button, RowSkeleton, CockpitCallout } from '@monprojetpro/ui'
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
      <div className="space-y-1.5" aria-label="Chargement des soumissions">
        {Array.from({ length: 3 }).map((_, i) => (
          <RowSkeleton key={i} className="h-10" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div role="alert">
        <CockpitCallout tone="red" icon={AlertCircle}>
          Erreur lors du chargement des soumissions.
        </CockpitCallout>
      </div>
    )
  }

  if (!submissions || submissions.length === 0) {
    return (
      <CockpitCallout tone="gray">
        Aucune soumission pour ce client.
      </CockpitCallout>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
      <table className="w-full text-sm" aria-label="Liste des soumissions">
        <thead>
          <tr className="border-b border-white/10">
            <th className="px-4 py-2.5 text-left text-[0.7rem] font-semibold uppercase tracking-wider text-gray-500">
              Étape
            </th>
            <th className="px-4 py-2.5 text-left text-[0.7rem] font-semibold uppercase tracking-wider text-gray-500">
              Date
            </th>
            <th className="px-4 py-2.5 text-left text-[0.7rem] font-semibold uppercase tracking-wider text-gray-500">
              Statut
            </th>
            <th className="px-4 py-2.5 text-left text-[0.7rem] font-semibold uppercase tracking-wider text-gray-500">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {submissions.map((submission) => (
            <tr key={submission.id} className="transition-colors hover:bg-white/[0.02]">
              <td className="px-4 py-3 font-medium text-gray-100">
                Étape {submission.stepNumber} — {submission.stepTitle}
              </td>
              <td className="px-4 py-3 text-gray-400 tabular-nums">
                {format(new Date(submission.submittedAt), 'dd MMM yyyy', { locale: fr })}
              </td>
              <td className="px-4 py-3">
                <SubmissionStatusBadge status={submission.status} />
              </td>
              <td className="px-4 py-3">
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-cyan-300/80 hover:bg-cyan-400/10 hover:text-cyan-200"
                >
                  <Link
                    href={
                      submission.validationRequestId
                        ? `/modules/validation-hub/${submission.validationRequestId}`
                        : `/modules/validation-hub`
                    }
                    aria-label={`Voir la soumission du ${format(new Date(submission.submittedAt), 'dd MMM yyyy', { locale: fr })}`}
                  >
                    <Eye className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
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

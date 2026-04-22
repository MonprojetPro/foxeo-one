'use client'

import { useState } from 'react'
import { formatRelativeDate } from '@monprojetpro/utils'
import type { StepSubmission } from '../types/parcours.types'
import type { SubmissionStatus } from '../types/parcours.types'
import { SubmissionDetailModal } from './submission-detail-modal'

interface StepSubmissionsListProps {
  submissions: StepSubmission[]
}

const STATUS_COLORS: Record<SubmissionStatus, { dot: string; badge: string; label: string }> = {
  pending: {
    dot: 'bg-yellow-400',
    badge: 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/30',
    label: 'En attente',
  },
  approved: {
    dot: 'bg-green-400',
    badge: 'bg-green-400/10 text-green-400 border border-green-400/30',
    label: 'Approuvé',
  },
  rejected: {
    dot: 'bg-red-400',
    badge: 'bg-red-400/10 text-red-400 border border-red-400/30',
    label: 'Refusé',
  },
  revision_requested: {
    dot: 'bg-orange-400',
    badge: 'bg-orange-400/10 text-orange-400 border border-orange-400/30',
    label: 'Révision',
  },
}

export function StepSubmissionsList({ submissions }: StepSubmissionsListProps) {
  const [selectedSubmission, setSelectedSubmission] = useState<StepSubmission | null>(null)

  if (submissions.length === 0) {
    return (
      <p className="text-xs text-[#6b7280] italic py-1">
        Aucune soumission pour cette étape
      </p>
    )
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {submissions.map((submission) => {
          const config = STATUS_COLORS[submission.status]
          const preview = submission.submissionContent.slice(0, 50)
          const isTruncated = submission.submissionContent.length > 50

          return (
            <li key={submission.id}>
              <button
                onClick={() => setSelectedSubmission(submission)}
                className="w-full text-left rounded-xl border border-[#2d2d2d] bg-[#1a1033]/30 px-3 py-2.5 hover:border-[#7c3aed]/40 hover:bg-[#1a1033]/60 transition-all"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${config.badge}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} aria-hidden="true" />
                    {config.label}
                  </span>
                  <span className="text-[11px] text-[#6b7280] shrink-0">
                    {formatRelativeDate(submission.submittedAt)}
                  </span>
                </div>
                <p className="text-xs text-[#9ca3af] leading-relaxed line-clamp-2">
                  {preview}{isTruncated && '…'}
                </p>
              </button>
            </li>
          )
        })}
      </ul>

      <SubmissionDetailModal
        submission={selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
      />
    </>
  )
}

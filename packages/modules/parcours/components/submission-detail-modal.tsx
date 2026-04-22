'use client'

import { useEffect, useRef } from 'react'
import { Button } from '@monprojetpro/ui'
import { formatRelativeDate } from '@monprojetpro/utils'
import type { StepSubmission } from '../types/parcours.types'
import { SubmissionStatusBadge } from './submission-status-badge'

interface SubmissionDetailModalProps {
  submission: StepSubmission | null
  onClose: () => void
}

export function SubmissionDetailModal({ submission, onClose }: SubmissionDetailModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  // Sync open state avec la prop submission (leçon API-003 — useEffect sur prop changeante)
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (submission) {
      if (!dialog.open && typeof dialog.showModal === 'function') dialog.showModal()
    } else {
      if (dialog.open) dialog.close()
    }
  }, [submission])

  // Fermer sur Escape ou clic backdrop
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const handleClose = () => onClose()
    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
  }, [onClose])

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) onClose()
  }

  if (!submission) return null

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className="m-auto rounded-2xl bg-[#141414] border border-[#2d2d2d] p-0 max-w-2xl w-full shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2d2d2d] shrink-0">
          <div className="flex items-center gap-3">
            <SubmissionStatusBadge status={submission.status} />
            <span className="text-xs text-[#6b7280]">
              {formatRelativeDate(submission.submittedAt)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#6b7280] hover:text-[#f9fafb] transition-colors"
            aria-label="Fermer"
          >
            <span className="text-xl leading-none">×</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <h3 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wide mb-3">
            Contenu de la soumission
          </h3>
          <div className="text-sm text-[#e5e7eb] leading-relaxed whitespace-pre-wrap bg-[#1a1033]/50 rounded-xl border border-[#2d2d2d] p-4">
            {submission.submissionContent}
          </div>

          {/* Feedback MiKL si présent */}
          {submission.feedback && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wide mb-3">
                Feedback MiKL
              </h3>
              <div className="rounded-xl border border-[#fb923c]/30 bg-[#fb923c]/5 px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-[#fb923c]">MiKL</span>
                  {submission.feedbackAt && (
                    <span className="text-xs text-[#6b7280]">
                      {formatRelativeDate(submission.feedbackAt)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#fed7aa] leading-relaxed">
                  {submission.feedback}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#2d2d2d] shrink-0 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </dialog>
  )
}

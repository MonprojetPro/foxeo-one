'use client'

import { useState } from 'react'
import { useStepHistory } from '../hooks/use-step-history'
import { StepSubmissionsList } from './step-submissions-list'
import { StepDocumentsList } from './step-documents-list'
import { StepFeedbackList } from './step-feedback-list'

interface CollapsibleSectionProps {
  title: string
  count: number
  defaultOpen?: boolean
  children: React.ReactNode
}

function CollapsibleSection({ title, count, defaultOpen = true, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-[#2d2d2d] last:border-b-0">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#1a1033]/30 transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#f9fafb] uppercase tracking-wide">
            {title}
          </span>
          {count > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#7c3aed]/20 text-[10px] font-medium text-[#a78bfa]">
              {count}
            </span>
          )}
        </div>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-[#6b7280] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  )
}

interface StepHistoryPanelProps {
  stepId: string | undefined
  stepNumber: number
}

export function StepHistoryPanel({ stepId, stepNumber }: StepHistoryPanelProps) {
  const { submissions, feedbackInjections, isLoadingSubmissions, isLoadingFeedback } = useStepHistory(stepId)

  const unreadFeedbackCount = feedbackInjections.filter((f) => f.readAt === null).length
  const totalFeedback = feedbackInjections.length

  return (
    <div className="hidden lg:flex w-[420px] shrink-0 flex-col bg-[#141414] border-l border-[#2d2d2d] overflow-hidden">
      {/* Panel header */}
      <div className="h-[52px] shrink-0 bg-[#1a1033] border-b border-[#2d2d2d] px-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-[26px] h-[26px] rounded-full bg-gradient-to-br from-[#7c3aed] to-[#a78bfa] flex items-center justify-center text-white font-bold text-[11px] shrink-0">
            H
          </div>
          <span className="text-[#a78bfa] font-semibold text-sm">
            Historique — Étape {stepNumber}
          </span>
        </div>
        {unreadFeedbackCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-blue-500 text-white text-[10px] font-bold px-1">
            {unreadFeedbackCount}
          </span>
        )}
      </div>

      {/* Sections scrollables */}
      <div className="flex-1 overflow-y-auto">
        <CollapsibleSection title="Soumissions" count={submissions.length} defaultOpen>
          {isLoadingSubmissions ? (
            <div className="flex flex-col gap-2 animate-pulse">
              <div className="h-14 rounded-xl bg-[#2d2d2d]" />
              <div className="h-14 rounded-xl bg-[#2d2d2d]" />
            </div>
          ) : (
            <StepSubmissionsList submissions={submissions} />
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Documents générés" count={0} defaultOpen={false}>
          {isLoadingSubmissions ? (
            <div className="h-14 rounded-xl bg-[#2d2d2d] animate-pulse" />
          ) : (
            <StepDocumentsList submissions={submissions} />
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Feedback MiKL" count={totalFeedback} defaultOpen={unreadFeedbackCount > 0}>
          {isLoadingFeedback ? (
            <div className="h-14 rounded-xl bg-[#2d2d2d] animate-pulse" />
          ) : (
            <StepFeedbackList feedbackInjections={feedbackInjections} />
          )}
        </CollapsibleSection>
      </div>
    </div>
  )
}

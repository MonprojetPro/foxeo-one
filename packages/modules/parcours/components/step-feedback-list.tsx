'use client'

import { formatRelativeDate } from '@monprojetpro/utils'
import type { StepFeedbackInjection } from '../hooks/use-step-history'

interface StepFeedbackListProps {
  feedbackInjections: StepFeedbackInjection[]
}

export function StepFeedbackList({ feedbackInjections }: StepFeedbackListProps) {
  if (feedbackInjections.length === 0) {
    return (
      <p className="text-xs text-[#6b7280] italic py-1">
        Aucun feedback pour le moment
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {feedbackInjections.map((feedback) => {
        const isUnread = feedback.readAt === null

        return (
          <li
            key={feedback.id}
            className="rounded-xl border border-[#fb923c]/20 bg-[#fb923c]/5 px-3 py-2.5"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                {isUnread && (
                  <span
                    className="w-2 h-2 rounded-full bg-blue-400 shrink-0"
                    aria-label="Non lu"
                  />
                )}
                <span className="text-[11px] font-semibold text-[#fb923c]">MiKL</span>
                <span className="text-[11px] text-[#6b7280]">
                  {formatRelativeDate(feedback.createdAt)}
                </span>
              </div>
            </div>
            <p className="text-xs text-[#fed7aa] leading-relaxed">
              {feedback.content}
            </p>
          </li>
        )
      })}
    </ul>
  )
}

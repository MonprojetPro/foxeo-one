'use client'

import { useState, useTransition } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { cn } from '@monprojetpro/utils'
import type { FeedbackRating } from '../types/elio.types'
import { submitFeedback } from '../actions/submit-feedback'

interface ElioFeedbackProps {
  messageId: string
  currentFeedback?: FeedbackRating
}

export function ElioFeedback({ messageId, currentFeedback }: ElioFeedbackProps) {
  const [feedback, setFeedback] = useState<FeedbackRating | null>(currentFeedback ?? null)
  const [isPending, startTransition] = useTransition()

  const handleFeedback = (rating: FeedbackRating) => {
    // Toggle: cliquer à nouveau désactive
    const newRating = feedback === rating ? null : rating

    // Optimistic update
    setFeedback(newRating)

    startTransition(async () => {
      await submitFeedback(messageId, newRating)
    })
  }

  return (
    <div
      className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
      data-testid="elio-feedback"
    >
      <button
        onClick={() => handleFeedback('useful')}
        disabled={isPending}
        className={cn(
          'p-1 rounded-full hover:bg-accent transition-colors',
          feedback === 'useful' && 'text-green-500 bg-green-500/10'
        )}
        aria-label="Réponse utile"
        aria-pressed={feedback === 'useful'}
        data-testid="feedback-useful"
      >
        <ThumbsUp className="w-4 h-4" />
      </button>
      <button
        onClick={() => handleFeedback('not_useful')}
        disabled={isPending}
        className={cn(
          'p-1 rounded-full hover:bg-accent transition-colors',
          feedback === 'not_useful' && 'text-red-500 bg-red-500/10'
        )}
        aria-label="Réponse pas utile"
        aria-pressed={feedback === 'not_useful'}
        data-testid="feedback-not-useful"
      >
        <ThumbsDown className="w-4 h-4" />
      </button>
    </div>
  )
}

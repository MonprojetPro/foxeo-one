'use client'

import { Button } from '@monprojetpro/ui'
import { ELIO_SUGGESTIONS_BY_STEP } from '../data/elio-suggestions'

interface ElioGuidedSuggestionsProps {
  stepNumber: number
  onSuggestionClick: (suggestion: string) => void
}

export function ElioGuidedSuggestions({ stepNumber, onSuggestionClick }: ElioGuidedSuggestionsProps) {
  const suggestions = ELIO_SUGGESTIONS_BY_STEP[stepNumber]

  if (!suggestions || suggestions.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-2 py-2">
      {suggestions.map((suggestion) => (
        <Button
          key={suggestion}
          variant="outline"
          size="sm"
          onClick={() => onSuggestionClick(suggestion)}
          className="h-auto whitespace-normal text-left text-xs"
        >
          {suggestion}
        </Button>
      ))}
    </div>
  )
}

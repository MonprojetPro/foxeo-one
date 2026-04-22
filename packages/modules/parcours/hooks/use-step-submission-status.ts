'use client'

import { useQuery } from '@tanstack/react-query'
import { getSubmissions } from '../actions/get-submissions'

interface UseStepSubmissionStatusResult {
  hasPending: boolean
  isLoading: boolean
}

/**
 * Story 14.7 — Vérifie si une soumission 'pending' existe pour une étape donnée.
 * Utilisé par GenerateDocumentButton pour désactiver le bouton si déjà soumis.
 */
export function useStepSubmissionStatus(stepId: string | undefined): UseStepSubmissionStatusResult {
  const { data, isLoading } = useQuery({
    queryKey: ['step-submission-status', stepId],
    queryFn: async () => {
      if (!stepId) return []
      const { data, error } = await getSubmissions({ stepId, status: 'pending' })
      if (error) throw new Error(error.message)
      return data ?? []
    },
    enabled: Boolean(stepId),
    staleTime: 30_000,
  })

  return {
    hasPending: (data?.length ?? 0) > 0,
    isLoading,
  }
}

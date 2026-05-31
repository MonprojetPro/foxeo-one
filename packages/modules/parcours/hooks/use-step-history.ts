'use client'

import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@monprojetpro/supabase'
import { getSubmissions } from '../actions/get-submissions'
import type { StepSubmissionWithStep } from '../types/parcours.types'

export interface StepFeedbackInjection {
  id: string
  stepId: string
  content: string
  readAt: string | null
  createdAt: string
}

export type { StepSubmissionWithStep }

export function useStepHistory(stepId: string | undefined) {
  const queryClient = useQueryClient()

  // Submissions query
  const submissionsQuery = useQuery<StepSubmissionWithStep[]>({
    queryKey: ['step-history-submissions', stepId],
    queryFn: async () => {
      if (!stepId) return []
      const { data, error } = await getSubmissions({ stepId })
      if (error) throw new Error(error.message)
      return data ?? []
    },
    enabled: Boolean(stepId),
    staleTime: 30_000,
  })

  // Feedback injections query — graceful fallback si la table n'existe pas encore
  const feedbackQuery = useQuery<StepFeedbackInjection[]>({
    queryKey: ['step-feedback-injections', stepId],
    queryFn: async () => {
      if (!stepId) return []
      try {
        const supabase = createBrowserSupabaseClient()
        // type='text_feedback' uniquement : les 'elio_questions' (feuille de route) sont des
        // consignes CACHÉES pour Élio et ne doivent jamais s'afficher en clair au client.
        const { data, error } = await supabase
          .from('step_feedback_injections')
          .select('id, step_id, content, read_at, created_at')
          .eq('step_id', stepId)
          .eq('type', 'text_feedback')
          .order('created_at', { ascending: false })

        // Si la table n'existe pas ou erreur → retourner tableau vide
        if (error) return []

        return (data ?? []).map((row) => ({
          id: row.id,
          stepId: row.step_id,
          content: row.content,
          readAt: row.read_at,
          createdAt: row.created_at,
        }))
      } catch {
        return []
      }
    },
    enabled: Boolean(stepId),
    staleTime: 60_000,
  })

  // Realtime subscription sur step_submissions ET step_feedback_injections filtrés par step_id
  useEffect(() => {
    if (!stepId) return

    const supabase = createBrowserSupabaseClient()

    const channel = supabase
      .channel(`step-history-${stepId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'step_submissions',
          filter: `parcours_step_id=eq.${stepId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['step-history-submissions', stepId] })
          queryClient.invalidateQueries({ queryKey: ['step-submission-status', stepId] })
          queryClient.invalidateQueries({ queryKey: ['step-submissions'] })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'step_feedback_injections',
          filter: `step_id=eq.${stepId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['step-feedback-injections', stepId] })
        }
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('[PARCOURS:HISTORY-REALTIME] Channel error:', err)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [stepId, queryClient])

  return {
    submissions: submissionsQuery.data ?? [],
    feedbackInjections: feedbackQuery.data ?? [],
    isLoadingSubmissions: submissionsQuery.isLoading,
    isLoadingFeedback: feedbackQuery.isLoading,
  }
}

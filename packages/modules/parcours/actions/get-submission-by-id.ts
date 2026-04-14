'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import type { StepSubmissionWithStep, StepSubmissionDB } from '../types/parcours.types'

export async function getSubmissionById(
  submissionId: string
): Promise<ActionResponse<StepSubmissionWithStep>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const { data, error } = await supabase
      .from('step_submissions')
      .select('*, parcours_steps(step_number, title, parcours_id)')
      .eq('id', submissionId)
      .single()

    if (error || !data) {
      return errorResponse('Soumission non trouvée', 'NOT_FOUND', error)
    }

    const db = data as StepSubmissionDB & {
      parcours_steps: { step_number: number; title: string; parcours_id: string } | null
    }

    const submission: StepSubmissionWithStep = {
      id: db.id,
      parcoursStepId: db.parcours_step_id,
      clientId: db.client_id,
      submissionContent: db.submission_content,
      submissionFiles: db.submission_files ?? [],
      submittedAt: db.submitted_at,
      status: db.status,
      feedback: db.feedback,
      feedbackAt: db.feedback_at,
      createdAt: db.created_at,
      updatedAt: db.updated_at,
      stepNumber: db.parcours_steps?.step_number ?? 0,
      stepTitle: db.parcours_steps?.title ?? '',
      parcoursId: db.parcours_steps?.parcours_id ?? '',
    }

    console.log('[PARCOURS:GET_SUBMISSION] Récupérée:', submissionId)

    return successResponse(submission)
  } catch (error) {
    console.error('[PARCOURS:GET_SUBMISSION] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}

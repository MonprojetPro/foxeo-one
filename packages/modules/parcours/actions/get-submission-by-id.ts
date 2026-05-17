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
      .select('*')
      .eq('id', submissionId)
      .single()

    if (error || !data) {
      return errorResponse('Soumission non trouvée', 'NOT_FOUND', error)
    }

    const db = data as StepSubmissionDB

    // parcours_step_id n'a plus de FK déclarée (migration 00116). Il peut pointer vers
    // client_parcours_agents (nouveau système Story 14.x) OU parcours_steps (ancien Lab brief).
    // On résout en deux queries parallèles, on garde le premier hit.
    const [cpaRes, psRes] = await Promise.all([
      supabase
        .from('client_parcours_agents')
        .select('step_order, step_label')
        .eq('id', db.parcours_step_id)
        .maybeSingle(),
      supabase
        .from('parcours_steps')
        .select('step_number, title, parcours_id')
        .eq('id', db.parcours_step_id)
        .maybeSingle(),
    ])

    const cpa = cpaRes.data as { step_order: number; step_label: string } | null
    const ps = psRes.data as { step_number: number; title: string; parcours_id: string } | null

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
      stepNumber: cpa?.step_order ?? ps?.step_number ?? 0,
      stepTitle: cpa?.step_label ?? ps?.title ?? '',
      parcoursId: ps?.parcours_id ?? '',
    }

    console.log('[PARCOURS:GET_SUBMISSION] Récupérée:', submissionId)

    return successResponse(submission)
  } catch (error) {
    console.error('[PARCOURS:GET_SUBMISSION] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}

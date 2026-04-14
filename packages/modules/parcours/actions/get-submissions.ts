'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import type { StepSubmission, StepSubmissionDB, StepSubmissionWithStep, SubmissionStatus } from '../types/parcours.types'
import { GetSubmissionsInput } from '../types/parcours.types'

function mapSubmission(db: StepSubmissionDB): StepSubmission {
  return {
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
  }
}

function mapSubmissionWithStep(
  db: StepSubmissionDB & { parcours_steps: { step_number: number; title: string; parcours_id: string } | null }
): StepSubmissionWithStep {
  return {
    ...mapSubmission(db),
    stepNumber: db.parcours_steps?.step_number ?? 0,
    stepTitle: db.parcours_steps?.title ?? '',
    parcoursId: db.parcours_steps?.parcours_id ?? '',
  }
}

export async function getSubmissions(
  input: { clientId?: string; stepId?: string; status?: SubmissionStatus }
): Promise<ActionResponse<StepSubmissionWithStep[]>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = GetSubmissionsInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    let query = supabase
      .from('step_submissions')
      .select('*, parcours_steps(step_number, title, parcours_id)')
      .order('submitted_at', { ascending: false })

    if (parsed.data.clientId) {
      query = query.eq('client_id', parsed.data.clientId)
    }

    if (parsed.data.stepId) {
      query = query.eq('parcours_step_id', parsed.data.stepId)
    }

    if (parsed.data.status) {
      query = query.eq('status', parsed.data.status)
    }

    const { data, error } = await query

    if (error) {
      return errorResponse('Échec récupération soumissions', 'DATABASE_ERROR', error)
    }

    type SubmissionRow = StepSubmissionDB & {
      parcours_steps: { step_number: number; title: string; parcours_id: string } | null
    }
    const submissions = (data as SubmissionRow[]).map(mapSubmissionWithStep)

    console.log('[PARCOURS:GET_SUBMISSIONS] Récupérées:', submissions.length)

    return successResponse(submissions)
  } catch (error) {
    console.error('[PARCOURS:GET_SUBMISSIONS] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}

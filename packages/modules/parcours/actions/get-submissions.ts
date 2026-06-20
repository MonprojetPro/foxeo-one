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
    submissionFiles: Array.isArray(db.submission_files) ? db.submission_files : [],
    submittedAt: db.submitted_at,
    status: db.status,
    feedback: db.feedback,
    feedbackAt: db.feedback_at,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  }
}

function mapSubmissionWithStep(
  db: StepSubmissionDB,
  step?: { stepNumber: number; stepTitle: string },
  validationRequestId?: string | null,
): StepSubmissionWithStep {
  return {
    ...mapSubmission(db),
    stepNumber: step?.stepNumber ?? 0,
    stepTitle: step?.stepTitle ?? '',
    parcoursId: '',
    validationRequestId: validationRequestId ?? null,
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
      .select('*')
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

    const rows = (data as StepSubmissionDB[]) ?? []

    // Enrichir avec le libellé/numéro d'étape (client_parcours_agents) — sinon « Étape 0 — ».
    const stepIds = [...new Set(rows.map((r) => r.parcours_step_id).filter(Boolean))]
    const stepById = new Map<string, { stepNumber: number; stepTitle: string }>()
    if (stepIds.length > 0) {
      const { data: agents } = await supabase
        .from('client_parcours_agents')
        .select('id, step_order, step_label')
        .in('id', stepIds)
      for (const a of agents ?? []) {
        stepById.set(a.id as string, {
          stepNumber: (a.step_order as number | null) ?? 0,
          stepTitle: (a.step_label as string | null) ?? '',
        })
      }
    }

    // Associer chaque soumission à sa demande de validation (Validation Hub) :
    // même step_id, créées ensemble → on apparie par created_at le plus proche.
    const vrByStep = new Map<string, { id: string; created_at: string }[]>()
    if (stepIds.length > 0) {
      const { data: requests } = await supabase
        .from('validation_requests')
        .select('id, step_id, created_at')
        .in('step_id', stepIds)
      for (const r of requests ?? []) {
        const list = vrByStep.get(r.step_id as string) ?? []
        list.push({ id: r.id as string, created_at: r.created_at as string })
        vrByStep.set(r.step_id as string, list)
      }
    }

    function matchValidationRequest(stepId: string, submittedAt: string | null): string | null {
      const list = vrByStep.get(stepId)
      if (!list || list.length === 0) return null
      if (!submittedAt) return list[0].id
      const target = new Date(submittedAt).getTime()
      let best = list[0]
      let bestDiff = Math.abs(new Date(best.created_at).getTime() - target)
      for (const r of list.slice(1)) {
        const diff = Math.abs(new Date(r.created_at).getTime() - target)
        if (diff < bestDiff) { best = r; bestDiff = diff }
      }
      return best.id
    }

    const submissions = rows.map((r) =>
      mapSubmissionWithStep(
        r,
        stepById.get(r.parcours_step_id),
        matchValidationRequest(r.parcours_step_id, r.submitted_at ?? r.created_at),
      ),
    )

    console.log('[PARCOURS:GET_SUBMISSIONS] Récupérées:', submissions.length)

    return successResponse(submissions)
  } catch (error) {
    console.error('[PARCOURS:GET_SUBMISSIONS] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}

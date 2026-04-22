'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import type { SubmitStepResult } from '../types/parcours.types'

/**
 * Story 14.7 — Soumet un document généré par Élio pour une étape du parcours.
 * Crée la soumission, la demande de validation, met à jour le statut de l'étape,
 * et notifie l'opérateur.
 */
export async function submitGeneratedDocument(
  input: { stepId: string; document: string }
): Promise<ActionResponse<SubmitStepResult>> {
  if (!input.stepId || !input.document?.trim()) {
    return errorResponse('stepId et document requis', 'VALIDATION_ERROR')
  }

  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    // Récupérer le client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, operator_id, name')
      .eq('auth_user_id', user.id)
      .single()

    if (clientError || !client) {
      return errorResponse('Client non trouvé', 'NOT_FOUND', { message: clientError?.message ?? 'not found' })
    }

    // Récupérer l'étape avec son parcours
    const { data: step, error: stepError } = await supabase
      .from('parcours_steps')
      .select('id, step_number, title, parcours_id, status')
      .eq('id', input.stepId)
      .single()

    if (stepError || !step) {
      return errorResponse('Étape non trouvée', 'NOT_FOUND', { message: stepError?.message ?? 'not found' })
    }

    if (step.status !== 'current') {
      return errorResponse('Cette étape n\'est pas en cours', 'INVALID_STATUS')
    }

    // Vérifier qu'il n'y a pas déjà une soumission pending
    const { data: existingSubmission } = await supabase
      .from('step_submissions')
      .select('id')
      .eq('parcours_step_id', input.stepId)
      .eq('client_id', client.id)
      .in('status', ['pending'])
      .maybeSingle()

    if (existingSubmission) {
      return errorResponse(
        'Une soumission est déjà en attente de validation pour cette étape',
        'DUPLICATE_SUBMISSION'
      )
    }

    // 1. INSERT step_submissions
    const { data: submission, error: submissionError } = await supabase
      .from('step_submissions')
      .insert({
        parcours_step_id: input.stepId,
        client_id: client.id,
        submission_content: input.document,
        submission_files: JSON.stringify([]),
      })
      .select('id')
      .single()

    if (submissionError || !submission) {
      return errorResponse('Échec création soumission', 'DATABASE_ERROR', {
        message: submissionError?.message ?? 'insert failed',
      })
    }

    // 2. INSERT validation_requests
    await supabase.from('validation_requests').insert({
      client_id: client.id,
      operator_id: client.operator_id,
      parcours_id: step.parcours_id,
      step_id: input.stepId,
      type: 'step_submission',
      title: `Nouvelle soumission — Étape ${step.step_number}`,
      content: input.document.substring(0, 500),
    })

    // 3. UPDATE parcours_steps status → 'pending_review'
    await supabase
      .from('parcours_steps')
      .update({ status: 'pending_review' })
      .eq('id', input.stepId)

    // 4. Notification opérateur
    await supabase.from('notifications').insert({
      recipient_type: 'operator',
      recipient_id: client.operator_id,
      type: 'alert',
      title: `Nouvelle soumission — Étape ${step.step_number}`,
      body: `${client.name} a soumis son document pour : ${step.title}`,
      link: `/modules/validation/submissions/${submission.id}`,
    })

    console.log('[PARCOURS:SUBMIT_GENERATED_DOC] Soumission créée:', submission.id)

    return successResponse({ submissionId: submission.id })
  } catch (error) {
    console.error('[PARCOURS:SUBMIT_GENERATED_DOC] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', {
      message: error instanceof Error ? error.message : String(error),
    })
  }
}

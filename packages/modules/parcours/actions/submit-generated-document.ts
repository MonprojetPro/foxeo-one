'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { generateConciergeWord } from './generate-concierge-word'
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

    // Récupérer l'étape depuis client_parcours_agents (nouveau système)
    const { data: step, error: stepError } = await supabase
      .from('client_parcours_agents')
      .select('id, step_order, step_label, client_id, status, elio_lab_agents(name)')
      .eq('id', input.stepId)
      .single()

    if (stepError || !step) {
      return errorResponse('Étape non trouvée', 'NOT_FOUND', { message: stepError?.message ?? 'not found' })
    }

    if (step.client_id !== client.id) {
      return errorResponse('Accès non autorisé à cette étape', 'FORBIDDEN')
    }

    if (step.status !== 'active') {
      return errorResponse('Cette étape n\'est pas active', 'INVALID_STATUS')
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

    const agentData = step.elio_lab_agents as { name?: string } | null
    const stepTitle = step.step_label ?? agentData?.name ?? `Étape ${step.step_order}`

    // 1. INSERT step_submissions
    const { data: submission, error: submissionError } = await supabase
      .from('step_submissions')
      .insert({
        parcours_step_id: input.stepId,
        client_id: client.id,
        submission_content: input.document,
        submission_files: [],
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
      parcours_id: null,
      step_id: input.stepId,
      type: 'step_submission',
      title: `Nouvelle soumission — ${stepTitle}`,
      content: input.document,
    })

    // 3. UPDATE client_parcours_agents status → 'pending_review' (en attente de validation MiKL)
    await supabase
      .from('client_parcours_agents')
      .update({ status: 'pending_review' })
      .eq('id', input.stepId)

    // 4. Notification opérateur
    const { data: operatorRow } = await supabase
      .from('operators')
      .select('auth_user_id')
      .eq('id', client.operator_id)
      .single()

    if (operatorRow?.auth_user_id) {
      await supabase.from('notifications').insert({
        recipient_type: 'operator',
        recipient_id: operatorRow.auth_user_id,
        type: 'alert',
        title: `Nouvelle soumission — ${stepTitle}`,
        body: `${client.name} a soumis son document pour : ${stepTitle}`,
        link: `/modules/validation-hub`,
      })
    }

    // « Mot d'Élio » vivant (LOT F) — accusé de réception sur-mesure, best-effort.
    try {
      await generateConciergeWord(client.id, { type: 'submission_sent', agentLabel: stepTitle })
    } catch (e) {
      console.error('[PARCOURS:SUBMIT_GENERATED_DOC] Mot d\'Élio non généré (ignoré):', e)
    }

    console.log('[PARCOURS:SUBMIT_GENERATED_DOC] Soumission créée:', submission.id)

    return successResponse({ submissionId: submission.id })
  } catch (error) {
    console.error('[PARCOURS:SUBMIT_GENERATED_DOC] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', {
      message: error instanceof Error ? error.message : String(error),
    })
  }
}

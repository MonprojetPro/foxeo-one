'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'

interface SubmitElioBriefInput {
  stepId: string
  content: string
}

interface SubmitElioBriefResult {
  submissionId: string
}

export async function submitElioBrief(
  input: SubmitElioBriefInput
): Promise<ActionResponse<SubmitElioBriefResult>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const MAX_BRIEF_LENGTH = 50_000

    if (!input.stepId || !input.content.trim()) {
      return errorResponse('stepId et content sont requis', 'VALIDATION_ERROR')
    }

    if (input.content.length > MAX_BRIEF_LENGTH) {
      return errorResponse('Le brief est trop long (max 50 000 caractères)', 'VALIDATION_ERROR')
    }

    // Récupérer client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, operator_id, name')
      .eq('auth_user_id', user.id)
      .single()

    if (clientError || !client) {
      return errorResponse('Client non trouvé', 'NOT_FOUND', clientError)
    }

    // Récupérer étape
    const { data: step, error: stepError } = await supabase
      .from('parcours_steps')
      .select('id, step_number, title')
      .eq('id', input.stepId)
      .single()

    if (stepError || !step) {
      return errorResponse('Étape non trouvée', 'NOT_FOUND', stepError)
    }

    // Vérifier soumission en attente existante
    const { data: existingSubmission } = await supabase
      .from('step_submissions')
      .select('id, status')
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

    // Créer soumission avec le brief généré
    const { data: submission, error: submissionError } = await supabase
      .from('step_submissions')
      .insert({
        parcours_step_id: input.stepId,
        client_id: client.id,
        submission_content: input.content,
        submission_files: JSON.stringify([]),
      })
      .select('id')
      .single()

    if (submissionError || !submission) {
      return errorResponse('Échec création soumission', 'DATABASE_ERROR', submissionError)
    }

    // Mettre à jour statut étape → pending_validation
    await supabase
      .from('parcours_steps')
      .update({ status: 'pending_validation' })
      .eq('id', input.stepId)

    // Notifications
    await supabase.from('notifications').insert([
      {
        recipient_type: 'operator',
        recipient_id: client.operator_id,
        type: 'alert',
        title: `Nouveau brief Élio — ${client.name}`,
        body: `Étape ${step.step_number}: ${step.title}`,
        link: `/modules/crm/clients/${client.id}/submissions/${submission.id}`,
      },
      {
        recipient_type: 'client',
        recipient_id: client.id,
        type: 'info',
        title: 'Brief soumis',
        body: 'MiKL va valider votre brief sous peu.',
      },
    ])

    console.log('[ELIO:SUBMIT_BRIEF] Soumission créée:', submission.id)

    return successResponse({ submissionId: submission.id })
  } catch (error) {
    console.error('[ELIO:SUBMIT_BRIEF] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}

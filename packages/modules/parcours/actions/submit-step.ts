'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import type { SubmitStepResult } from '../types/parcours.types'
import { SubmitStepInput } from '../types/parcours.types'

export async function submitStep(
  input: { stepId: string; content: string; files?: File[] }
): Promise<ActionResponse<SubmitStepResult>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    // Validate input (content + stepId)
    const parsed = SubmitStepInput.safeParse({
      stepId: input.stepId,
      content: input.content,
      files: input.files?.map((f) => f.name),
    })
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
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
      .select('id, step_number, title, parcours_id, status, validation_required')
      .eq('id', input.stepId)
      .single()

    if (stepError || !step) {
      return errorResponse('Étape non trouvée', 'NOT_FOUND', stepError)
    }

    // Vérifier qu'il n'y a pas déjà une soumission pending/en attente
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

    // Upload fichiers vers Storage
    const fileUrls: string[] = []
    if (input.files && input.files.length > 0) {
      for (const file of input.files) {
        const filename = `${crypto.randomUUID()}-${file.name}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('submissions')
          .upload(`${client.id}/${input.stepId}/${filename}`, file)

        if (uploadError) {
          console.error('[PARCOURS:SUBMIT] Upload error:', uploadError)
          continue
        }

        fileUrls.push(uploadData.path)
      }
    }

    // Créer soumission
    const { data: submission, error: submissionError } = await supabase
      .from('step_submissions')
      .insert({
        parcours_step_id: input.stepId,
        client_id: client.id,
        submission_content: input.content,
        submission_files: JSON.stringify(fileUrls),
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

    // Notification opérateur
    await supabase.from('notifications').insert([
      {
        recipient_type: 'operator',
        recipient_id: client.operator_id,
        type: 'alert',
        title: `Nouvelle soumission — ${client.name}`,
        body: `Étape ${step.step_number}: ${step.title}`,
        link: `/modules/crm/clients/${client.id}/submissions/${submission.id}`,
      },
      {
        recipient_type: 'client',
        recipient_id: client.id,
        type: 'info',
        title: 'Soumission envoyée',
        body: 'MiKL va valider votre travail sous peu.',
      },
    ])

    console.log('[PARCOURS:SUBMIT] Soumission créée:', submission.id)

    return successResponse({ submissionId: submission.id })
  } catch (error) {
    console.error('[PARCOURS:SUBMIT] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}

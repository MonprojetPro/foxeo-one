'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import type { CompleteStepResult, ParcoursStepDB } from '../types/parcours.types'
import { CompleteStepInput } from '../types/parcours.types'

export async function completeStep(
  input: { stepId: string }
): Promise<ActionResponse<CompleteStepResult>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = CompleteStepInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    // Récupérer l'étape + parcours associé
    const { data: step, error: stepError } = await supabase
      .from('parcours_steps')
      .select('*, parcours(id, client_id)')
      .eq('id', parsed.data.stepId)
      .single()

    if (stepError || !step) {
      return errorResponse('Étape non trouvée', 'NOT_FOUND', stepError)
    }

    const typedStep = step as ParcoursStepDB & { parcours: { id: string; client_id: string } }

    // Vérification statut: seule une étape 'current' peut être complétée
    if (typedStep.status !== 'current') {
      return errorResponse(
        "Seule l'étape en cours peut être complétée",
        'INVALID_STATUS'
      )
    }

    // Vérification validation obligatoire
    if (typedStep.validation_required && !typedStep.validation_id) {
      return errorResponse(
        "Cette étape nécessite une validation MiKL avant d'être complétée",
        'VALIDATION_REQUIRED'
      )
    }

    // Marquer comme completed
    const { error: completeError } = await supabase
      .from('parcours_steps')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', parsed.data.stepId)

    if (completeError) {
      console.error('[PARCOURS:COMPLETE_STEP] Error marking step complete:', completeError)
      return errorResponse('Échec mise à jour de l\'étape', 'DB_ERROR', completeError)
    }

    // Unlock étape suivante
    const nextStepNumber = typedStep.step_number + 1
    const { data: nextStep } = await supabase
      .from('parcours_steps')
      .select('id')
      .eq('parcours_id', typedStep.parcours_id)
      .eq('step_number', nextStepNumber)
      .single()

    let nextStepUnlocked = false
    let parcoursCompleted = false

    if (nextStep) {
      const { error: unlockError } = await supabase
        .from('parcours_steps')
        .update({ status: 'current' })
        .eq('id', nextStep.id)

      if (!unlockError) {
        nextStepUnlocked = true
        console.log('[PARCOURS:UNLOCK_NEXT] Next step unlocked:', nextStep.id)
      }
    } else {
      // Dernière étape — parcours terminé
      parcoursCompleted = true

      await supabase
        .from('parcours')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', typedStep.parcours_id)

      // Récupérer l'operator_id du client
      const { data: clientData } = await supabase
        .from('clients')
        .select('operator_id')
        .eq('id', typedStep.parcours.client_id)
        .single()

      // Notifications client + opérateur
      await supabase.from('notifications').insert([
        {
          recipient_type: 'client',
          recipient_id: typedStep.parcours.client_id,
          type: 'success',
          title: 'Parcours Lab terminé ! 🎉',
          body: 'Félicitations, vous avez complété toutes les étapes de votre parcours.',
        },
        ...(clientData?.operator_id
          ? [
              {
                recipient_type: 'operator',
                recipient_id: clientData.operator_id,
                type: 'info',
                title: 'Parcours Lab terminé',
                body: `Le client a terminé son parcours Lab.`,
                link: `/modules/crm/clients/${typedStep.parcours.client_id}`,
              },
            ]
          : []),
      ])

      console.log('[PARCOURS:COMPLETE_STEP] Parcours completed for client:', typedStep.parcours.client_id)
    }

    console.log('[PARCOURS:COMPLETE_STEP] Step completed:', parsed.data.stepId, '| Next unlocked:', nextStepUnlocked)

    return successResponse({ nextStepUnlocked, parcoursCompleted })
  } catch (error) {
    console.error('[PARCOURS:COMPLETE_STEP] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}

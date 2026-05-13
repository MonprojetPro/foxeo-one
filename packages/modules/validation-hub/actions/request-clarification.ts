'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { errorResponse, successResponse } from '@monprojetpro/types'
import type { ActionResponse } from '@monprojetpro/types'
import { toCamelCase } from '@monprojetpro/utils'
import { sendMessage } from '@monprojetpro/modules-chat'
import { z } from 'zod'
import type { ValidationRequest } from '../types/validation.types'

const requestClarificationSchema = z.object({
  requestId: z.string().uuid('requestId doit être un UUID valide'),
  comment: z
    .string()
    .min(10, 'La question doit contenir au moins 10 caractères')
    .max(1000, 'La question ne doit pas dépasser 1000 caractères'),
})

/**
 * Demande de précisions sur une soumission.
 *
 * Comportement (validé avec MiKL — mai 2026) :
 * - La demande reste en `pending` (ni validée ni refusée — elle reste dans la file Hub)
 * - La question est envoyée comme message dans le chat MiKL ↔ Client (module chat)
 * - Le client répond dans le chat, MiKL valide/refuse plus tard depuis la file
 *
 * Pas d'usine à gaz : pas de statut needs_clarification visible côté client,
 * pas d'injection dans la sidebar étape, pas de carte étape bleue.
 */
export async function requestClarification(
  requestId: string,
  comment: string
): Promise<ActionResponse<ValidationRequest>> {
  try {
    const validated = requestClarificationSchema.safeParse({ requestId, comment })
    if (!validated.success) {
      return errorResponse('Données invalides', 'VALIDATION_ERROR', validated.error)
    }

    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const { data: operator, error: opError } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (opError || !operator) {
      return errorResponse('Opérateur non trouvé', 'NOT_FOUND')
    }

    // Récupérer la demande pour avoir client_id + operator_id + title + step_id
    const { data: request, error: fetchError } = await supabase
      .from('validation_requests')
      .select('id, client_id, operator_id, type, title, step_id, status')
      .eq('id', requestId)
      .single()

    if (fetchError || !request) {
      return errorResponse('Demande introuvable', 'NOT_FOUND', fetchError)
    }

    const requestData = request as {
      id: string
      client_id: string
      operator_id: string
      type: string
      title: string
      step_id: string | null
      status: string
    }

    // On garde une trace de la question dans reviewer_comment (utile pour l'historique
    // dans la vue détail Hub) mais on NE CHANGE PAS le status — il reste 'pending'.
    const { data: updated, error: updateError } = await supabase
      .from('validation_requests')
      .update({
        reviewer_comment: comment,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single()

    if (updateError) {
      console.error('[VALIDATION-HUB:CLARIFICATION] Error updating request:', updateError)
      return errorResponse("Erreur lors de l'enregistrement de la question", 'DB_ERROR', updateError)
    }

    // Composer un message clair pour le client et l'envoyer dans le chat MiKL ↔ Client.
    // sendMessage gère la notif automatiquement (cloche client + link /modules/chat).
    const messageContent = `📋 Demande de précisions — ${requestData.title}\n\n${comment}\n\nRéponds-moi ici, je validerai ta soumission dès qu'on aura clarifié.`

    const messageResult = await sendMessage({
      clientId: requestData.client_id,
      operatorId: requestData.operator_id,
      senderType: 'operator',
      content: messageContent,
    })

    if (messageResult.error) {
      console.error('[VALIDATION-HUB:CLARIFICATION] Error sending chat message:', messageResult.error)
      // Non-bloquant : la question a été enregistrée en DB, mais le message chat a échoué.
      // On retourne success quand même pour ne pas annuler l'enregistrement.
    }

    return successResponse(toCamelCase(updated as Record<string, unknown>) as ValidationRequest)
  } catch (err) {
    console.error('[VALIDATION-HUB:CLARIFICATION] Unexpected error:', err)
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR', err)
  }
}

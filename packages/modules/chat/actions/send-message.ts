'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { SendMessageInput, type MessageDB } from '../types/chat.types'
import { toMessage } from '../utils/to-message'

export async function sendMessage(
  input: SendMessageInput
): Promise<ActionResponse<Message>> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = SendMessageInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { clientId, operatorId, senderType, content } = parsed.data

    // Verify the authenticated user matches the claimed sender
    if (senderType === 'operator') {
      const { data: operator } = await supabase
        .from('operators')
        .select('id')
        .eq('id', operatorId)
        .eq('auth_user_id', user.id)
        .single()
      if (!operator) {
        return errorResponse('Non autorisé — opérateur invalide', 'FORBIDDEN')
      }
    } else {
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('id', clientId)
        .eq('auth_user_id', user.id)
        .single()
      if (!client) {
        return errorResponse('Non autorisé — client invalide', 'FORBIDDEN')
      }
    }

    const { attachmentUrl, attachmentName, attachmentType } = parsed.data

    const { data, error } = await supabase
      .from('messages')
      .insert({
        client_id: clientId,
        operator_id: operatorId,
        sender_type: senderType,
        content,
        ...(attachmentUrl ? { attachment_url: attachmentUrl, attachment_name: attachmentName, attachment_type: attachmentType } : {}),
      })
      .select()
      .single()

    if (error || !data) {
      console.error('[CHAT:SEND_MESSAGE] DB insert error:', error)
      return errorResponse("Erreur lors de l'envoi du message", 'DB_ERROR', error)
    }

    return successResponse(toMessage(data as MessageDB))
  } catch (error) {
    console.error('[CHAT:SEND_MESSAGE] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}

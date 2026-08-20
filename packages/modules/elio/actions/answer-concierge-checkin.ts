'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'

/** Réponse du client à une prise de nouvelles d'Élio One. */
export type CheckinAnswer = 'ok' | 'not_ok'

/**
 * Server Action — le client répond à la prise de nouvelles d'Élio One (2026-08-20).
 *
 * Deux boutons sous le mot d'Élio, dans le bandeau de l'accueil One :
 *  • « Oui, tout va bien »  → 'ok'
 *  • « Non, pas trop »      → 'not_ok' (l'UI ouvre ensuite le chat Élio, amorcé)
 *
 * Dans les deux cas le mot est marqué répondu et disparaît du bandeau : le mot précédent
 * (livraison d'outil, évolution annoncée…) reprend sa place. C'est TOUT l'intérêt du
 * mécanisme — une prise de nouvelles ne doit pas enterrer définitivement un message utile.
 *
 * L'écriture passe par la RPC `answer_one_checkin` (SECURITY DEFINER) et non par un UPDATE
 * direct : une policy UPDATE porterait sur la ligne entière et laisserait le client réécrire
 * le `body` du mot d'Élio. La RPC vérifie l'ownership (clients.auth_user_id) et n'écrit que
 * les deux colonnes de réponse. Elle éteint aussi la notification cloche associée.
 *
 * ⚠️ Cette action ne prévient JAMAIS MiKL, même sur 'not_ok'. Le relais reste soumis à
 * l'accord explicite du client dans le chat (jeton [[prevenir-mikl:…]]) — garde-fou du
 * modèle « Élio = extension de MiKL, jamais mouchard ».
 */
export async function answerConciergeCheckin(
  messageId: string,
  answer: CheckinAnswer,
): Promise<ActionResponse<boolean>> {
  if (!messageId) {
    return errorResponse('Identifiant du message manquant', 'VALIDATION_ERROR')
  }

  if (answer !== 'ok' && answer !== 'not_ok') {
    return errorResponse('Réponse invalide', 'VALIDATION_ERROR')
  }

  try {
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase.rpc('answer_one_checkin', {
      p_message_id: messageId,
      p_answer: answer,
    })

    if (error) {
      console.error('[ELIO:CHECKIN_ANSWER] RPC error:', error.message)
      return errorResponse('Erreur lors de l’enregistrement de ta réponse', 'DATABASE_ERROR', error)
    }

    // `false` = mot inexistant, déjà répondu, ou appartenant à un autre client. La RPC reste
    // volontairement muette sur la cause (pas d'oracle) : côté UI, un mot déjà répondu a de
    // toute façon disparu du bandeau, donc rien à signaler au client.
    if (data !== true) {
      return successResponse(false)
    }

    return successResponse(true)
  } catch (err) {
    console.error('[ELIO:CHECKIN_ANSWER] Unexpected error:', String(err))
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR', { message: String(err) })
  }
}

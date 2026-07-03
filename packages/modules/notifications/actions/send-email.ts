'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'

export interface GraduationEmailInput {
  clientId: string
}

/**
 * Server Action — Envoie l'email de graduation via l'Edge Function `send-email`
 * (déjà déployée), en reproduisant le pattern standard du repo :
 *
 * INSERT d'une notification `type: 'graduation'` → le trigger DB
 * `trg_send_email_on_notification` (migrations 00024 + 20260610162608) invoque
 * automatiquement `send-email` avec `{ notificationId }`, qui rend le template
 * graduation (personnalisé en base via `email_templates.graduation`, sinon HTML
 * intégré) et envoie via Resend. Les préférences email du client
 * (`email_notifications_enabled`) sont respectées côté Edge Function.
 *
 * ⚠️ Ne PAS appeler en plus de `sendGraduationNotification` pour le même client :
 * la notification client créée par cette dernière déclenche DÉJÀ l'email de
 * graduation via le même trigger. Cette action sert de voie explicite/fallback
 * quand la notification in-app n'a pas pu être créée (sinon email en double).
 *
 * Convention notifications (règle projet) : recipient_id = auth_user_id
 * (jamais clients.id), type présent dans la liste CHECK, title NOT NULL,
 * INSERT sans `.select()` (la policy SELECT est owner-only → 42501 sinon).
 *
 * L'envoi est non-bloquant : une erreur est loggée mais ne bloque pas la
 * graduation. Retourne toujours { data, error } — jamais throw.
 */
export async function sendGraduationEmail(
  input: GraduationEmailInput
): Promise<ActionResponse<{ sent: boolean }>> {
  const { clientId } = input

  if (!clientId) {
    return errorResponse('clientId requis', 'VALIDATION_ERROR')
  }

  const supabase = await createServerSupabaseClient()

  // Charger le client pour résoudre son auth_user_id (destinataire)
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, auth_user_id, name')
    .eq('id', clientId)
    .single()

  if (clientError || !client) {
    console.error('[NOTIFICATIONS:EMAIL:GRADUATION] Client not found:', clientError)
    return errorResponse('Client introuvable', 'NOT_FOUND', clientError)
  }

  if (!client.auth_user_id) {
    // Client sans compte auth (pas encore activé) → pas d'email possible
    console.error(
      '[NOTIFICATIONS:EMAIL:GRADUATION] Client sans auth_user_id, email non envoyé:',
      clientId
    )
    return successResponse({ sent: false })
  }

  // INSERT sans .select() — le trigger DB invoque l'Edge Function send-email
  const { error: insertError } = await supabase.from('notifications').insert({
    recipient_type: 'client',
    recipient_id: client.auth_user_id,
    type: 'graduation',
    title: 'Félicitations ! Votre espace MonprojetPro One est prêt !',
    body: 'Votre parcours Lab est terminé. Découvrez votre nouvel espace One.',
    link: '/',
  })

  if (insertError) {
    console.error('[NOTIFICATIONS:EMAIL:GRADUATION] Notification insert error:', insertError)
    // Non-bloquant : on log mais on retourne succès partiel
    return successResponse({ sent: false })
  }

  return successResponse({ sent: true })
}

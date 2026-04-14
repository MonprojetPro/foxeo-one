'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { createNotification } from './create-notification'

export interface GraduationNotificationInput {
  clientId: string
  clientName: string
  operatorId: string
  modulesCount: number
  tier: string
  instanceUrl?: string
}

/**
 * Server Action — Envoie les notifications de graduation :
 * - Notification in-app au client (type: 'graduation')
 * - Notification système à l'opérateur (type: 'system')
 *
 * Appelée après le succès de la transaction de graduation (Story 9.1).
 * Retourne toujours { data, error } — jamais throw.
 */
export async function sendGraduationNotification(
  input: GraduationNotificationInput
): Promise<ActionResponse<{ clientNotified: boolean; operatorNotified: boolean }>> {
  const { clientId, clientName, operatorId, modulesCount, tier } = input

  if (!clientId || !operatorId || !clientName) {
    return errorResponse('clientId, operatorId et clientName requis', 'VALIDATION_ERROR')
  }

  const supabase = await createServerSupabaseClient()

  // Récupérer le client_auth_user_id pour la notification client
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('auth_user_id')
    .eq('id', clientId)
    .single()

  if (clientError || !client) {
    console.error('[NOTIFICATIONS:GRADUATION] Client not found:', clientError)
    return errorResponse('Client introuvable', 'NOT_FOUND', clientError)
  }

  let clientNotified = false
  let operatorNotified = false

  // 1. Notification client (graduation)
  const clientResult = await createNotification({
    recipientType: 'client',
    recipientId: client.auth_user_id,
    type: 'graduation',
    title: "Félicitations ! Votre espace professionnel MonprojetPro One est prêt !",
    body: `Votre parcours Lab est terminé. Vous avez maintenant accès à votre dashboard personnalisé avec ${modulesCount} module${modulesCount > 1 ? 's' : ''} activé${modulesCount > 1 ? 's' : ''}.`,
    link: '/',
  })

  if (clientResult.error) {
    console.error('[NOTIFICATIONS:GRADUATION] Client notification failed:', clientResult.error)
  } else {
    clientNotified = true
  }

  // 2. Récupérer le auth_user_id de l'opérateur
  const { data: operator, error: operatorError } = await supabase
    .from('operators')
    .select('auth_user_id')
    .eq('id', operatorId)
    .single()

  if (operatorError || !operator) {
    console.error('[NOTIFICATIONS:GRADUATION] Operator not found:', operatorError)
  } else {
    // 3. Notification opérateur (system)
    const operatorResult = await createNotification({
      recipientType: 'operator',
      recipientId: operator.auth_user_id,
      type: 'system',
      title: `Graduation effectuée — ${clientName} est maintenant client One`,
      body: `Tier : ${tier} | Modules activés : ${modulesCount} | Date : ${new Date().toLocaleDateString('fr-FR')}`,
      link: `/modules/crm/clients/${clientId}`,
    })

    if (operatorResult.error) {
      console.error('[NOTIFICATIONS:GRADUATION] Operator notification failed:', operatorResult.error)
    } else {
      operatorNotified = true
    }
  }

  return successResponse({ clientNotified, operatorNotified })
}

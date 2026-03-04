'use server'

import { createServerSupabaseClient } from '@foxeo/supabase'
import type { ActionResponse } from '@foxeo/types'

/**
 * Server Action — Envoie des SMS via le module SMS.
 * Vérifie que le module est actif, exécute l'action, loggue dans activity_logs.
 * Utilisé par Élio One+ (AC2, FR48 — Story 8.9a).
 *
 * Retourne toujours { data, error } — jamais throw.
 */
export async function sendSms(
  clientId: string,
  recipientIds: string[],
  message: string,
): Promise<ActionResponse<{ sent: number }>> {
  if (!message?.trim()) {
    return {
      data: null,
      error: { message: 'Le message SMS ne peut pas être vide', code: 'VALIDATION_ERROR' },
    }
  }

  if (!recipientIds || recipientIds.length === 0) {
    return {
      data: null,
      error: { message: 'Aucun destinataire sélectionné pour l\'envoi SMS', code: 'VALIDATION_ERROR' },
    }
  }

  const supabase = await createServerSupabaseClient()

  // 1. Vérifier module actif (AC3)
  const { data: config } = await supabase
    .from('client_configs')
    .select('active_modules')
    .eq('client_id', clientId)
    .maybeSingle()

  if (!config?.active_modules?.includes('sms')) {
    return {
      data: null,
      error: {
        message: 'Le module SMS n\'est pas activé pour ce client',
        code: 'MODULE_NOT_ACTIVE',
      },
    }
  }

  // 2. Envoyer les SMS — stub : le module SMS sera implémenté plus tard
  // Dans une vraie implémentation, appelle l'API SMS du module
  const sent = recipientIds.length

  // 3. Logger l'action (AC2 — acteur elio_one_plus)
  const { error: logError } = await supabase.from('activity_logs').insert({
    actor_type: 'elio_one_plus',
    actor_id: clientId,
    action: 'send_sms',
    entity_type: 'sms',
    metadata: {
      module: 'sms',
      recipientIds,
      sent,
      messagePreview: message.substring(0, 100),
    },
  })

  if (logError) {
    console.error('[ELIO:ACTION] Failed to log send_sms:', logError.message)
  }

  return { data: { sent }, error: null }
}

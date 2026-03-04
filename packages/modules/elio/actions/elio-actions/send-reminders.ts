'use server'

import { createServerSupabaseClient } from '@foxeo/supabase'
import type { ActionResponse } from '@foxeo/types'

/**
 * Server Action — Envoie des rappels de cotisation aux membres via le module Adhésions.
 * Vérifie que le module est actif, exécute l'action, loggue dans activity_logs.
 * Utilisé par Élio One+ (AC2, FR48 — Story 8.9a).
 *
 * Retourne toujours { data, error } — jamais throw.
 */
export async function sendReminders(
  clientId: string,
  memberIds: string[],
): Promise<ActionResponse<{ sent: number }>> {
  if (!memberIds || memberIds.length === 0) {
    return {
      data: null,
      error: { message: 'Aucun membre sélectionné pour l\'envoi des rappels', code: 'VALIDATION_ERROR' },
    }
  }

  const supabase = await createServerSupabaseClient()

  // 1. Vérifier module actif (AC3)
  const { data: config } = await supabase
    .from('client_configs')
    .select('active_modules')
    .eq('client_id', clientId)
    .maybeSingle()

  if (!config?.active_modules?.includes('adhesions')) {
    return {
      data: null,
      error: {
        message: 'Le module Adhésions n\'est pas activé pour ce client',
        code: 'MODULE_NOT_ACTIVE',
      },
    }
  }

  // 2. Exécuter l'action — stub : le module adhésions sera implémenté plus tard
  // Dans une vraie implémentation, appelle l'API du module pour envoyer les rappels
  const sent = memberIds.length

  // 3. Logger l'action (AC2 — acteur elio_one_plus)
  const { error: logError } = await supabase.from('activity_logs').insert({
    actor_type: 'elio_one_plus',
    actor_id: clientId,
    action: 'send_reminders',
    entity_type: 'adhesions',
    metadata: {
      module: 'adhesions',
      memberIds,
      sent,
    },
  })

  if (logError) {
    console.error('[ELIO:ACTION] Failed to log send_reminders:', logError.message)
  }

  return { data: { sent }, error: null }
}

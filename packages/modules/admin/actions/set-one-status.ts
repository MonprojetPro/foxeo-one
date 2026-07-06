'use server'

import { z } from 'zod'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { createNotification } from '@monprojetpro/modules-notifications'
import { generateOneConciergeWord } from '@monprojetpro/module-elio'

const SetOneStatusSchema = z.object({
  clientId: z.string().uuid('ID client invalide'),
  oneStatus: z.enum(['construction', 'delivered']),
})

/**
 * Bascule le cycle de vie visuel du One d'un client : « en chantier » ↔ « livré ».
 * Vision v2 §6 — purement visuel côté client (bandeau chantier + cockpits qui
 * s'allument), aucune restriction d'accès. La table client_configs a un trigger
 * broadcast Realtime → la bascule est instantanée côté client (router.refresh).
 */
export async function setOneStatus(
  clientId: string,
  oneStatus: 'construction' | 'delivered',
): Promise<ActionResponse<{ oneStatus: 'construction' | 'delivered' }>> {
  const parsed = SetOneStatusSchema.safeParse({ clientId, oneStatus })
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? 'Données invalides', 'VALIDATION_ERROR')
  }

  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return errorResponse('Non authentifié', 'UNAUTHORIZED')

    const { data: operator } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()
    if (!operator) return errorResponse('Accès réservé aux opérateurs', 'UNAUTHORIZED')

    // Le client doit appartenir à l'opérateur
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, auth_user_id')
      .eq('id', clientId)
      .eq('operator_id', operator.id)
      .single()
    if (clientError || !client) {
      return errorResponse('Client introuvable', 'NOT_FOUND')
    }

    const { error: updateError } = await supabase
      .from('client_configs')
      .update({ one_status: oneStatus })
      .eq('client_id', clientId)

    if (updateError) {
      console.error('[ADMIN:SET_ONE_STATUS] Update error:', updateError)
      return errorResponse('Erreur lors de la bascule chantier/livré', 'DATABASE_ERROR')
    }

    await supabase.from('activity_logs').insert({
      actor_type: 'operator',
      actor_id: operator.id,
      action: oneStatus === 'delivered' ? 'one_delivered' : 'one_back_to_construction',
      entity_type: 'client',
      entity_id: clientId,
      metadata: { oneStatus, clientName: client.name },
    })

    // Notification cloche côté client (best-effort — la bascule ne doit jamais échouer pour ça).
    // Convention notifications : recipient_id = auth_user_id, type dans la liste CHECK.
    if (client.auth_user_id) {
      try {
        await createNotification({
          recipientType: 'client',
          recipientId: client.auth_user_id as string,
          type: 'tool_update',
          title:
            oneStatus === 'delivered'
              ? '🎉 Votre outil est livré !'
              : 'Votre outil repasse en chantier',
          body:
            oneStatus === 'delivered'
              ? 'Votre outil sur-mesure est prêt — les cockpits de pilotage sont maintenant actifs sur votre tableau de bord.'
              : 'MiKL travaille sur votre outil (améliorations en cours). Votre tableau de bord reste entièrement accessible.',
          link: '/',
        })
      } catch (notifError) {
        console.error('[ADMIN:SET_ONE_STATUS] Notification error (ignored):', notifError)
      }
    }

    // Mot d'Élio sur l'accueil One (best-effort, erreurs avalées par l'action elle-même)
    await generateOneConciergeWord(clientId, {
      type: oneStatus === 'delivered' ? 'tool_delivered' : 'tool_construction',
    })

    return successResponse({ oneStatus })
  } catch (error) {
    console.error('[ADMIN:SET_ONE_STATUS] Unexpected error:', error)
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR')
  }
}

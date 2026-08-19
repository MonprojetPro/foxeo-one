'use server'

import { createServerSupabaseClient, createServiceRoleSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'

/** Longueur max du point relayé — aligné sur la contrainte du chat (SendMessageInput.content). */
const MAX_RELAY_LENGTH = 4000

/**
 * Server Action — Élio One relaie à MiKL, DANS LE CHAT, ce que le client vient de lui dire.
 *
 * Décision MiKL du 2026-08-19 : Élio One est « une extension de MiKL ». Quand le client
 * signale que quelque chose ne va pas sur son projet, Élio propose de prévenir MiKL — et
 * ne le fait QUE si le client accepte. Cette action est donc appelée uniquement après un
 * accord explicite côté UI (bouton), jamais spontanément par le modèle.
 *
 * Différence avec `escalateToMiKL` : celle-ci ne créait qu'une notification (« Élio n'était
 * pas sûr de sa réponse »). Ici on veut une vraie trace conversationnelle dans le Chat MiKL,
 * pour que l'échange se poursuive normalement entre le client et MiKL.
 *
 * Le message est inséré avec `via_elio = true` → badge « Relayé par Élio One » côté Hub et
 * côté client. L'insertion passe par le service role parce que la policy RLS interdit
 * volontairement à un client de positionner `via_elio` lui-même (sinon n'importe qui
 * pourrait se faire passer pour Élio).
 *
 * Retourne toujours { data, error } — jamais throw.
 */
export async function relayToMiklChat(
  clientId: string,
  summary: string
): Promise<ActionResponse<boolean>> {
  if (!clientId || !summary.trim()) {
    return errorResponse('clientId et résumé sont requis', 'VALIDATION_ERROR')
  }

  const content = summary.trim().slice(0, MAX_RELAY_LENGTH)

  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    // Le client ne peut relayer que pour LUI-MÊME : on vérifie l'appartenance avant de
    // basculer sur le service role (qui, lui, ne vérifie plus rien).
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, operator_id')
      .eq('id', clientId)
      .eq('auth_user_id', user.id)
      .single()

    if (clientError || !client) {
      return errorResponse('Non autorisé — client invalide', 'FORBIDDEN', clientError)
    }

    const serviceSupabase = createServiceRoleSupabaseClient()

    const { error: insertError } = await serviceSupabase.from('messages').insert({
      client_id: clientId,
      operator_id: client.operator_id,
      sender_type: 'client',
      content,
      via_elio: true,
    })

    if (insertError) {
      console.error('[ELIO:RELAY] Message insert error:', insertError)
      return errorResponse('Erreur lors de la transmission à MiKL', 'DB_ERROR', insertError)
    }

    // Notification opérateur — recipient_id = auth_user_id (jamais operators.id).
    const { data: operator } = await serviceSupabase
      .from('operators')
      .select('auth_user_id')
      .eq('id', client.operator_id)
      .single()

    if (operator?.auth_user_id) {
      const preview = content.length > 200 ? `${content.slice(0, 200)}…` : content
      const { error: notifError } = await serviceSupabase.from('notifications').insert({
        recipient_type: 'operator',
        recipient_id: operator.auth_user_id,
        type: 'message',
        title: `Élio One te transmet un point — ${client.name}`,
        body: preview,
        link: `/modules/chat/${clientId}`,
      })

      // Le message est déjà dans le chat (visible en Realtime) : une notification ratée
      // ne doit pas faire échouer le relais, seulement se voir dans les logs.
      if (notifError) {
        console.error('[ELIO:RELAY] Notification error (message déjà posté):', notifError)
      }
    }

    return successResponse(true)
  } catch (error) {
    console.error('[ELIO:RELAY] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}

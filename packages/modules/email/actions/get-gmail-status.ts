'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'
import { getValidAccessToken } from '../utils/gmail-api'
import type { GmailStatus } from '../types/email.types'

/**
 * État RÉEL de la connexion Gmail — T-055.
 *
 * 🔴 CE QUI ÉTAIT FAUX : cette fonction répondait `connected: !!integration`,
 * c'est-à-dire « une LIGNE existe en base ». Elle ne vérifiait jamais que le
 * jeton fonctionnait. Résultat, découvert le 2026-10-15 : l'onglet Emails
 * affichait fièrement « Connecté avec contact@monprojet-pro.com » **depuis le
 * 10 avril**, alors que le jeton était mort depuis six mois et qu'aucun email
 * ne pouvait ni partir ni être lu. MiKL ne l'a appris qu'en voyant un envoi
 * échouer.
 *
 * 🔑 UN ÉTAT QUI NE DÉRIVE PAS DE LA RÉALITÉ MENT DÈS QUE LA RÉALITÉ CHANGE.
 * On tente donc un vrai rafraîchissement de jeton, et on distingue TROIS états
 * — le troisième est précisément celui qui manquait :
 *
 *   never      : aucune intégration — il faut connecter
 *   connected  : le jeton répond — tout va bien
 *   expired    : l'intégration existe mais le jeton est mort — RECONNECTER
 *
 * Confondre `never` et `expired` n'était pas une approximation d'affichage :
 * c'est ce qui a rendu une panne de six mois invisible.
 */
export async function getGmailStatus(): Promise<ActionResponse<GmailStatus>> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse('Non authentifié', 'AUTH_ERROR')

  const { data: integration } = await supabase
    .from('gmail_integrations')
    .select('gmail_email')
    .eq('operator_id', user.id)
    .maybeSingle()

  if (!integration) {
    return successResponse({ connected: false, email: null, state: 'never' })
  }

  // La vérification qui manquait : le jeton répond-il VRAIMENT ?
  // `getValidAccessToken` rafraîchit si nécessaire et rend `null` si le refresh
  // token a été révoqué — c'est exactement le signal qu'on cherche.
  const accessToken = await getValidAccessToken(supabase, user.id)

  if (!accessToken) {
    return successResponse({
      connected: false,
      email: integration.gmail_email ?? null,
      state: 'expired',
    })
  }

  return successResponse({
    connected: true,
    email: integration.gmail_email ?? null,
    state: 'connected',
  })
}

/**
 * Garde « espace figé » — client qui a résilié son abonnement.
 *
 * RÈGLE MÉTIER
 * Un client en `subscription_cancelled` ou `handed_off` garde son espace en consultation
 * et peut toujours écrire à MiKL (chat, support), mais ne peut plus faire avancer son
 * parcours Lab. Cette garde est le contrôle à poser en tête des Server Actions de
 * MUTATION du parcours.
 *
 * ⚠️ Ce fichier n'a volontairement PAS de directive 'use server' : il exporte des
 * constantes, et dans un module 'use server' tout export doit être une fonction async
 * — un export de valeur y casse le build de production sans que tsc ni vitest ne
 * le voient.
 *
 * Ce contrôle DOUBLE la RLS (migration 20260726170000), il ne la remplace pas : la RLS
 * est le vrai verrou, celui-ci existe pour rendre une erreur lisible plutôt qu'un échec
 * Postgres brut.
 */
import type { ActionError } from '@monprojetpro/types'
import { createServerSupabaseClient } from './server'

/** Statuts de fin d'abonnement — miroir exact du CHECK de `clients.status`. */
export const READ_ONLY_CLIENT_STATUSES = ['subscription_cancelled', 'handed_off'] as const

export type ReadOnlyClientStatus = (typeof READ_ONLY_CLIENT_STATUSES)[number]

/** Code d'erreur unique — permet à l'UI de reconnaître le cas sans parser le message. */
export const READ_ONLY_ERROR_CODE = 'READ_ONLY'

/**
 * Ton volontairement non punitif : l'abonnement est terminé, l'espace reste ouvert.
 * Le client doit comprendre qu'il n'a rien perdu, pas qu'il est sanctionné.
 */
export const READ_ONLY_ERROR_MESSAGE =
  'Votre abonnement est terminé — votre espace est consultable mais non modifiable.'

export function isReadOnlyClientStatus(status: string | null | undefined): boolean {
  return READ_ONLY_CLIENT_STATUSES.includes(status as ReadOnlyClientStatus)
}

/** Erreur typée à renvoyer telle quelle dans le `error` d'une ActionResponse. */
export function readOnlyError(): ActionError {
  return { message: READ_ONLY_ERROR_MESSAGE, code: READ_ONLY_ERROR_CODE }
}

/**
 * Retourne une `ActionError` si l'utilisateur connecté est un client en fin
 * d'abonnement, `null` sinon.
 *
 * Permissif par défaut : opérateur, session absente, client introuvable ou erreur de
 * lecture → `null` (écriture autorisée). Une panne de lecture ne doit jamais bloquer un
 * client actif ; c'est la RLS qui reste le garde-fou dur.
 *
 * Usage :
 *   const readOnly = await checkClientWriteAllowed()
 *   if (readOnly) return { data: null, error: readOnly }
 */
export async function checkClientWriteAllowed(): Promise<ActionError | null> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return null

    const { data: client } = await supabase
      .from('clients')
      .select('status')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    const status = (client as { status: string } | null)?.status
    return isReadOnlyClientStatus(status) ? readOnlyError() : null
  } catch (error) {
    console.error('[READ_ONLY_GUARD] Lecture du statut client échouée:', error)
    return null
  }
}

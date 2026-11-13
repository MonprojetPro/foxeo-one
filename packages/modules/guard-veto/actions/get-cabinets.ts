'use server'

import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { assertOperator } from '@monprojetpro/supabase'
import { callGuardVetoAdmin, GuardVetoAdminError } from './admin-client'
import type { CabinetsReponse } from '../types'

/**
 * GET /cabinets — la liste des cabinets GuardVeto et de quoi remplir les
 * onglets Tableau de bord et Cabinets.
 *
 * 🔑 `assertOperator()` AVANT l'appel : une Server Action n'est pas protégée
 * par la page qui l'affiche. Next expose un identifiant d'action, et qui le
 * connaît peut l'appeler sans jamais ouvrir le Hub. Sans cette ligne, les
 * données d'un cabinet vétérinaire seraient lisibles par n'importe quel compte
 * client connecté.
 */
export async function getGuardVetoCabinets(): Promise<ActionResponse<CabinetsReponse>> {
  const { error: authError } = await assertOperator()
  if (authError) return { data: null, error: authError }

  try {
    const data = await callGuardVetoAdmin<CabinetsReponse>('/cabinets')
    return successResponse(data)
  } catch (err) {
    if (err instanceof GuardVetoAdminError) {
      return errorResponse(err.message, `GUARDVETO_HTTP_${err.status}`)
    }
    return errorResponse(
      err instanceof Error ? err.message : 'Erreur inconnue lors de l\'appel au guichet GuardVeto',
      'GUARDVETO_UNKNOWN',
    )
  }
}

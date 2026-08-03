'use server'

import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { callMenuFacileAdmin, MenuFacileAdminError } from './admin-client'
import type { HouseholdsDistribution, RetentionCohorts } from '../types'

/**
 * Vues d'ensemble du Tableau de bord (répartition par taille, cohortes).
 *
 * Ces deux endpoints sont les plus récents du guichet : ils peuvent ne pas
 * encore exister. Le code d'erreur `MENUFACILE_HTTP_404` est donc traité par
 * l'UI comme « pas encore disponible » (section masquée avec explication),
 * jamais comme une panne.
 */
function toError(err: unknown, what: string): ActionResponse<never> {
  if (err instanceof MenuFacileAdminError) {
    return errorResponse(err.message, `MENUFACILE_HTTP_${err.status}`)
  }
  return errorResponse(
    err instanceof Error ? err.message : `Erreur inconnue sur ${what}`,
    'MENUFACILE_UNKNOWN',
  )
}

/** GET /metrics/households-distribution — répartition des foyers par taille. */
export async function getHouseholdsDistribution(): Promise<
  ActionResponse<HouseholdsDistribution>
> {
  try {
    const data = await callMenuFacileAdmin<HouseholdsDistribution>(
      '/metrics/households-distribution',
    )
    if (!data) return errorResponse('Répartition indisponible', 'MENUFACILE_HTTP_404')
    return successResponse(data)
  } catch (err) {
    return toError(err, 'la répartition des foyers')
  }
}

/** GET /metrics/retention-cohorts — cohortes de rétention. */
export async function getRetentionCohorts(): Promise<ActionResponse<RetentionCohorts>> {
  try {
    const data = await callMenuFacileAdmin<RetentionCohorts>('/metrics/retention-cohorts')
    if (!data) return errorResponse('Cohortes indisponibles', 'MENUFACILE_HTTP_404')
    return successResponse(data)
  } catch (err) {
    return toError(err, 'les cohortes de rétention')
  }
}

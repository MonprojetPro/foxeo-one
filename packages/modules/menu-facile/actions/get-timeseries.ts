'use server'

import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { callMenuFacileAdmin, MenuFacileAdminError } from './admin-client'
import type { MenuFacileTimeseries } from '../types'

/**
 * GET /metrics/timeseries?days=N — série jour-par-jour pour les graphiques du cockpit
 * (nouveaux comptes, DAU, copies…). Server Action : ne `throw` jamais.
 * `days` est borné à [1, 90] pour rester raisonnable.
 */
export async function getMenuFacileTimeseries(
  days = 30,
): Promise<ActionResponse<MenuFacileTimeseries>> {
  try {
    const d = Math.min(Math.max(1, Math.floor(days || 30)), 90)
    const data = await callMenuFacileAdmin<MenuFacileTimeseries>(
      `/metrics/timeseries?days=${d}`,
    )
    return successResponse(data)
  } catch (err) {
    if (err instanceof MenuFacileAdminError) {
      return errorResponse(err.message, `MENUFACILE_HTTP_${err.status}`)
    }
    return errorResponse(
      err instanceof Error ? err.message : 'Erreur inconnue lors de l\'appel au guichet MenuFacile',
      'MENUFACILE_UNKNOWN',
    )
  }
}

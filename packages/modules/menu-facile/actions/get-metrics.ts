'use server'

import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { callMenuFacileAdmin, MenuFacileAdminError } from './admin-client'
import type { MenuFacileMetrics } from '../types'

/**
 * GET /metrics — KPIs globaux du produit MenuFacile (users, recettes, modération…).
 * Server Action : ne `throw` jamais, renvoie toujours `{ data, error }`.
 */
export async function getMenuFacileMetrics(): Promise<ActionResponse<MenuFacileMetrics>> {
  try {
    const data = await callMenuFacileAdmin<MenuFacileMetrics>('/metrics')
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

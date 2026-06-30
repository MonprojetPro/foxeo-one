'use server'

import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { callMenuFacileAdmin, MenuFacileAdminError } from './admin-client'
import type { OfficialRecipeDetail } from '../types'

/**
 * GET /recipes/:id — détail complet de N'IMPORTE QUELLE recette (y compris recettes
 * d'utilisateur), pour pouvoir juger un signalement. Même shape que le détail
 * d'une recette officielle. Server-only via le guichet.
 */
export async function getRecipeFull(id: string): Promise<ActionResponse<OfficialRecipeDetail>> {
  try {
    const data = await callMenuFacileAdmin<OfficialRecipeDetail>(
      `/recipes/${encodeURIComponent(id)}`,
    )
    return successResponse(data)
  } catch (err) {
    if (err instanceof MenuFacileAdminError) {
      return errorResponse(err.message, `MENUFACILE_HTTP_${err.status}`)
    }
    return errorResponse(
      err instanceof Error ? err.message : 'Erreur inconnue lors du chargement de la recette',
      'MENUFACILE_UNKNOWN',
    )
  }
}

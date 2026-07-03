'use server'

import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { callMenuFacileAdmin, MenuFacileAdminError } from './admin-client'
import type { HomeBanner, HomeBannerInput } from '../types'

function toError(err: unknown): ActionResponse<never> {
  if (err instanceof MenuFacileAdminError) {
    return errorResponse(err.message, `MENUFACILE_HTTP_${err.status}`)
  }
  return errorResponse(
    err instanceof Error ? err.message : 'Erreur inconnue sur l\'encart d\'accueil',
    'MENUFACILE_UNKNOWN',
  )
}

/** GET /home-banner — état actuel de l'encart libre d'accueil de l'appli. */
export async function getHomeBanner(): Promise<ActionResponse<HomeBanner>> {
  try {
    const data = await callMenuFacileAdmin<HomeBanner>('/home-banner')
    return successResponse(data)
  } catch (err) {
    return toError(err)
  }
}

/**
 * PUT /home-banner — publie l'encart. Corps PARTIEL : n'envoyer que les champs
 * modifiés. La publication est instantanée pour tous les utilisateurs (realtime
 * côté appli MenuFacile).
 */
export async function updateHomeBanner(
  patch: HomeBannerInput,
): Promise<ActionResponse<true>> {
  try {
    await callMenuFacileAdmin('/home-banner', {
      method: 'PUT',
      body: JSON.stringify(patch),
    })
    return successResponse(true)
  } catch (err) {
    return toError(err)
  }
}

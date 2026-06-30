'use server'

import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { callMenuFacileAdmin, MenuFacileAdminError } from './admin-client'
import type { ReportStatus } from '../types'

function toError(err: unknown): ActionResponse<never> {
  if (err instanceof MenuFacileAdminError) {
    return errorResponse(err.message, `MENUFACILE_HTTP_${err.status}`)
  }
  return errorResponse(
    err instanceof Error ? err.message : 'Erreur inconnue lors de l\'action de modération',
    'MENUFACILE_UNKNOWN',
  )
}

/** POST /moderation/hide — masque (ou réaffiche) une recette. */
export async function hideRecipe(input: {
  recipeId: string
  hidden?: boolean
  reason?: string
}): Promise<ActionResponse<true>> {
  try {
    await callMenuFacileAdmin('/moderation/hide', {
      method: 'POST',
      body: JSON.stringify({
        recipe_id: input.recipeId,
        hidden: input.hidden ?? true,
        reason: input.reason,
      }),
    })
    return successResponse(true)
  } catch (err) {
    return toError(err)
  }
}

/** POST /moderation/ban — bannit un user jusqu'à `until` (ISO) ; null = lever le ban. */
export async function banUser(input: {
  userId: string
  until?: string | null
  reason?: string
}): Promise<ActionResponse<true>> {
  try {
    await callMenuFacileAdmin('/moderation/ban', {
      method: 'POST',
      body: JSON.stringify({
        user_id: input.userId,
        until: input.until ?? null,
        reason: input.reason,
      }),
    })
    return successResponse(true)
  } catch (err) {
    return toError(err)
  }
}

/** POST /moderation/resolve-report — change le statut d'un signalement. */
export async function resolveReport(input: {
  reportId: string
  status: ReportStatus
  reason?: string
}): Promise<ActionResponse<true>> {
  try {
    await callMenuFacileAdmin('/moderation/resolve-report', {
      method: 'POST',
      body: JSON.stringify({
        report_id: input.reportId,
        status: input.status,
        reason: input.reason,
      }),
    })
    return successResponse(true)
  } catch (err) {
    return toError(err)
  }
}

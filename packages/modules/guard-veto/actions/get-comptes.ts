'use server'

import { z } from 'zod'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { assertOperator } from '@monprojetpro/supabase'
import { callGuardVetoAdmin, GuardVetoAdminError } from './admin-client'
import type { ComptesReponse } from '../types'

const Schema = z.object({ cabinetId: z.string().uuid('Cabinet invalide') })

/**
 * GET /comptes?cabinetId= — les comptes d'un cabinet, avec leur état lisible.
 *
 * L'identifiant est validé ici AVANT de partir chez GuardVeto : un paramètre
 * mal formé doit être refusé par le Hub, pas voyagé jusqu'au guichet pour en
 * revenir en 400 anonyme.
 */
export async function getGuardVetoComptes(
  cabinetId: string,
): Promise<ActionResponse<ComptesReponse>> {
  const { error: authError } = await assertOperator()
  if (authError) return { data: null, error: authError }

  const parsed = Schema.safeParse({ cabinetId })
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? 'Cabinet invalide', 'VALIDATION_ERROR')
  }

  try {
    const data = await callGuardVetoAdmin<ComptesReponse>(
      `/comptes?cabinetId=${encodeURIComponent(parsed.data.cabinetId)}`,
    )
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

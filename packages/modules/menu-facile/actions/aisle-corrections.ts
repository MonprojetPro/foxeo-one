'use server'

import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { callMenuFacileAdmin, MenuFacileAdminError } from './admin-client'
import type { MenuFacileAisleCorrection } from '../types'

/**
 * F-049 — rangement des aliments dans la liste de courses de MenuFacile.
 *
 * Un utilisateur qui trouve un aliment mal rangé le remet lui-même dans le bon
 * rayon. Jusqu'ici il devait nous le signaler et attendre — ce qui est arrivé
 * deux fois pour un même foyer. Sa correction vaut d'abord pour son foyer seul,
 * et remonte ici pour que l'équipe l'arbitre.
 *
 * Valider une correction écrit dans `global_ingredient_aisles` côté MenuFacile :
 * elle s'applique aussitôt à tous les foyers qui n'ont pas leur propre réglage,
 * SANS déploiement.
 */

function toError(err: unknown, what: string): ActionResponse<never> {
  if (err instanceof MenuFacileAdminError) {
    return errorResponse(err.message, `MENUFACILE_HTTP_${err.status}`)
  }
  return errorResponse(
    err instanceof Error ? err.message : `Erreur inconnue — ${what}`,
    'MENUFACILE_UNKNOWN',
  )
}

/** GET /aisle-corrections — toutes les corrections, la plus récente d'abord. */
export async function getAisleCorrections(): Promise<
  ActionResponse<MenuFacileAisleCorrection[]>
> {
  try {
    const data = await callMenuFacileAdmin<MenuFacileAisleCorrection[]>('/aisle-corrections')
    return successResponse(data ?? [])
  } catch (err) {
    return toError(err, 'chargement des corrections de rayon')
  }
}

/** POST /aisle-corrections/promote — valider ce rangement pour tous les foyers. */
export async function promoteAisleCorrection(input: {
  ingredientKey: string
  ingredientLabel: string
  aisle: string
  householdId?: string | null
}): Promise<ActionResponse<true>> {
  try {
    await callMenuFacileAdmin('/aisle-corrections/promote', {
      method: 'POST',
      body: JSON.stringify({
        ingredient_key: input.ingredientKey,
        ingredient_label: input.ingredientLabel,
        aisle: input.aisle,
        household_id: input.householdId ?? null,
      }),
    })
    return successResponse(true)
  } catch (err) {
    return toError(err, 'validation du rangement')
  }
}

/**
 * POST /aisle-corrections/revoke — retirer une validation globale.
 * Les corrections locales des foyers ne sont pas touchées : chacun garde le
 * rangement qu'il s'était choisi.
 */
export async function revokeAisleCorrection(input: {
  ingredientKey: string
}): Promise<ActionResponse<true>> {
  try {
    await callMenuFacileAdmin('/aisle-corrections/revoke', {
      method: 'POST',
      body: JSON.stringify({ ingredient_key: input.ingredientKey }),
    })
    return successResponse(true)
  } catch (err) {
    return toError(err, 'retrait de la validation')
  }
}

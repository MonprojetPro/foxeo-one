'use server'

import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { callMenuFacileAdmin, MenuFacileAdminError } from './admin-client'
import type { OfficialRecipeListItem, OfficialRecipeInput } from '../types'

function toError(err: unknown): ActionResponse<never> {
  if (err instanceof MenuFacileAdminError) {
    return errorResponse(err.message, `MENUFACILE_HTTP_${err.status}`)
  }
  return errorResponse(
    err instanceof Error ? err.message : 'Erreur inconnue sur les recettes officielles',
    'MENUFACILE_UNKNOWN',
  )
}

/** GET /official-recipes — liste des recettes officielles. */
export async function getOfficialRecipes(): Promise<ActionResponse<OfficialRecipeListItem[]>> {
  try {
    const data = await callMenuFacileAdmin<OfficialRecipeListItem[]>('/official-recipes')
    return successResponse(data ?? [])
  } catch (err) {
    return toError(err)
  }
}

/** POST /official-recipes — crée une recette (name + seasons[] requis). */
export async function createOfficialRecipe(
  input: OfficialRecipeInput,
): Promise<ActionResponse<{ id: string }>> {
  try {
    const data = await callMenuFacileAdmin<{ id: string }>('/official-recipes', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return successResponse(data)
  } catch (err) {
    return toError(err)
  }
}

/** PATCH /official-recipes/:id — édite une recette (ingredients/steps remplacent si fournis). */
export async function updateOfficialRecipe(
  id: string,
  input: Partial<OfficialRecipeInput>,
): Promise<ActionResponse<true>> {
  try {
    await callMenuFacileAdmin(`/official-recipes/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
    return successResponse(true)
  } catch (err) {
    return toError(err)
  }
}

/** DELETE /official-recipes/:id — supprime une recette. */
export async function deleteOfficialRecipe(id: string): Promise<ActionResponse<true>> {
  try {
    await callMenuFacileAdmin(`/official-recipes/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    return successResponse(true)
  } catch (err) {
    return toError(err)
  }
}

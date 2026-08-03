'use server'

import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { callMenuFacileAdmin, MenuFacileAdminError } from './admin-client'
import { buildHouseholdsQuery, MAX_LIMIT } from '../utils/query'
import type {
  HouseholdDetail,
  HouseholdListItem,
  HouseholdsQuery,
  Paginated,
} from '../types'

/** Garde-fou de l'export : au-delà, on s'arrête et on le signale à l'appelant. */
const EXPORT_CAP = 5000

function toError(err: unknown): ActionResponse<never> {
  if (err instanceof MenuFacileAdminError) {
    return errorResponse(err.message, `MENUFACILE_HTTP_${err.status}`)
  }
  return errorResponse(
    err instanceof Error ? err.message : 'Erreur inconnue sur les foyers',
    'MENUFACILE_UNKNOWN',
  )
}

/** Enveloppe vide — utilisée si le guichet renvoie `null` plutôt qu'une page. */
function emptyPage(q: HouseholdsQuery): Paginated<HouseholdListItem> {
  return { items: [], total: 0, limit: q.limit ?? 50, offset: q.offset ?? 0 }
}

/** GET /households — une page de la liste des foyers. */
export async function getHouseholds(
  q: HouseholdsQuery = {},
): Promise<ActionResponse<Paginated<HouseholdListItem>>> {
  try {
    const data = await callMenuFacileAdmin<Paginated<HouseholdListItem>>(
      `/households${buildHouseholdsQuery(q)}`,
    )
    return successResponse(data ?? emptyPage(q))
  } catch (err) {
    return toError(err)
  }
}

/** GET /households/:id — fiche complète d'un foyer. */
export async function getHousehold(id: string): Promise<ActionResponse<HouseholdDetail>> {
  try {
    const data = await callMenuFacileAdmin<HouseholdDetail>(
      `/households/${encodeURIComponent(id)}`,
    )
    if (!data) return errorResponse('Foyer introuvable', 'MENUFACILE_HTTP_404')
    return successResponse(data)
  } catch (err) {
    return toError(err)
  }
}

/**
 * Récupère TOUS les foyers correspondant aux filtres, en enchaînant les pages.
 * Sert uniquement à l'export CSV — le guichet n'a pas d'endpoint d'export dédié.
 *
 * `truncated` vaut `true` si le garde-fou a stoppé la collecte avant la fin :
 * l'appelant doit alors le dire à l'utilisateur plutôt que de laisser croire
 * que le fichier est complet.
 */
export async function getAllHouseholds(
  q: HouseholdsQuery = {},
): Promise<ActionResponse<{ items: HouseholdListItem[]; total: number; truncated: boolean }>> {
  try {
    const items: HouseholdListItem[] = []
    let offset = 0
    let total = 0

    for (;;) {
      const page = await callMenuFacileAdmin<Paginated<HouseholdListItem>>(
        `/households${buildHouseholdsQuery({ ...q, limit: MAX_LIMIT, offset })}`,
      )
      const batch = page?.items ?? []
      total = page?.total ?? items.length

      items.push(...batch)
      offset += batch.length

      // Fin normale : page incomplète, plus rien à lire, ou total atteint.
      if (batch.length < MAX_LIMIT || offset >= total) break
      // Garde-fou : on s'arrête et on le signale.
      if (items.length >= EXPORT_CAP) {
        return successResponse({ items: items.slice(0, EXPORT_CAP), total, truncated: true })
      }
    }

    return successResponse({ items, total, truncated: false })
  } catch (err) {
    return toError(err)
  }
}

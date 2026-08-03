'use server'

import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { callMenuFacileAdmin, MenuFacileAdminError } from './admin-client'
import { buildUsersQuery } from '../utils/query'
import type { Paginated, UserListItem, UsersQuery } from '../types'

function toError(err: unknown): ActionResponse<never> {
  if (err instanceof MenuFacileAdminError) {
    return errorResponse(err.message, `MENUFACILE_HTTP_${err.status}`)
  }
  return errorResponse(
    err instanceof Error ? err.message : 'Erreur inconnue sur les utilisateurs',
    'MENUFACILE_UNKNOWN',
  )
}

/** GET /users — une page de la liste des utilisateurs. */
export async function getUsers(
  q: UsersQuery = {},
): Promise<ActionResponse<Paginated<UserListItem>>> {
  try {
    const data = await callMenuFacileAdmin<Paginated<UserListItem>>(`/users${buildUsersQuery(q)}`)
    return successResponse(
      data ?? { items: [], total: 0, limit: q.limit ?? 50, offset: q.offset ?? 0 },
    )
  } catch (err) {
    return toError(err)
  }
}

import type { HouseholdsQuery, UsersQuery } from '../types'

/** Plafond imposé par le guichet : au-delà, il ignore la valeur. */
export const MAX_LIMIT = 100

/** Taille de page par défaut du cockpit. */
export const PAGE_SIZE = 50

/**
 * Construit la query string de `GET /households`.
 * Les valeurs vides sont omises pour laisser le guichet appliquer ses défauts.
 */
export function buildHouseholdsQuery(q: HouseholdsQuery = {}): string {
  const p = new URLSearchParams()

  if (q.limit !== undefined) p.set('limit', String(Math.min(Math.max(1, q.limit), MAX_LIMIT)))
  if (q.offset !== undefined && q.offset > 0) p.set('offset', String(q.offset))
  if (q.search?.trim()) p.set('search', q.search.trim())
  if (q.sort) p.set('sort', q.sort)
  if (q.order) p.set('order', q.order)
  if (q.activity && q.activity !== 'all') p.set('activity', q.activity)
  if (q.official !== undefined) p.set('official', String(q.official))

  const qs = p.toString()
  return qs ? `?${qs}` : ''
}

/**
 * Construit la query string de `GET /users`.
 * Même principe que les foyers : on omet tout ce qui vaut le défaut du guichet.
 */
export function buildUsersQuery(q: UsersQuery = {}): string {
  const p = new URLSearchParams()

  if (q.limit !== undefined) p.set('limit', String(Math.min(Math.max(1, q.limit), MAX_LIMIT)))
  if (q.offset !== undefined && q.offset > 0) p.set('offset', String(q.offset))
  if (q.search?.trim()) p.set('search', q.search.trim())
  if (q.sort) p.set('sort', q.sort)
  if (q.order) p.set('order', q.order)
  if (q.status && q.status !== 'all') p.set('status', q.status)
  if (q.verified !== undefined) p.set('verified', String(q.verified))

  const qs = p.toString()
  return qs ? `?${qs}` : ''
}

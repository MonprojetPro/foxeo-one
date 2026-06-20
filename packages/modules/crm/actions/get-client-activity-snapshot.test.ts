import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const VALID_ID = '550e8400-e29b-41d4-a716-446655440001'

const mockGetUser = vi.fn()
// Réponses par table, configurées par test.
const tableResults: Record<string, { data: unknown; error: unknown }> = {}

/** Builder chaînable : toute méthode renvoie le builder, maybeSingle résout selon la table. */
function makeBuilder(table: string) {
  const builder: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'order', 'limit']) {
    builder[method] = vi.fn(() => builder)
  }
  builder.maybeSingle = vi.fn(() =>
    Promise.resolve(tableResults[table] ?? { data: null, error: null })
  )
  return builder
}

const mockFrom = vi.fn((table: string) => makeBuilder(table))

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

describe('getClientActivitySnapshot Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const key of Object.keys(tableResults)) delete tableResults[key]
    mockGetUser.mockResolvedValue({ data: { user: { id: 'op-1' } }, error: null })
    // Date figée pour un calcul de daysSinceActivity déterministe.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-20T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('rejette un identifiant invalide', async () => {
    const { getClientActivitySnapshot } = await import('./get-client-activity-snapshot')
    const result = await getClientActivitySnapshot('pas-un-uuid')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('INVALID_INPUT')
  })

  it('rejette un utilisateur non authentifié', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const { getClientActivitySnapshot } = await import('./get-client-activity-snapshot')
    const result = await getClientActivitySnapshot(VALID_ID)
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('renvoie un snapshot vide quand aucune activité', async () => {
    tableResults.clients = { data: { first_login_at: null }, error: null }
    tableResults.client_parcours_agents = { data: null, error: null }
    tableResults.step_submissions = { data: null, error: null }

    const { getClientActivitySnapshot } = await import('./get-client-activity-snapshot')
    const result = await getClientActivitySnapshot(VALID_ID)

    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      firstLoginAt: null,
      lastActivityAt: null,
      daysSinceActivity: null,
      isInactive: false,
    })
  })

  it('retient le mouvement le plus récent entre agent et soumission', async () => {
    tableResults.clients = { data: { first_login_at: '2026-06-01T08:00:00Z' }, error: null }
    tableResults.client_parcours_agents = { data: { updated_at: '2026-06-18T10:00:00Z' }, error: null }
    tableResults.step_submissions = { data: { created_at: '2026-06-15T10:00:00Z' }, error: null }

    const { getClientActivitySnapshot } = await import('./get-client-activity-snapshot')
    const result = await getClientActivitySnapshot(VALID_ID)

    expect(result.error).toBeNull()
    expect(result.data?.firstLoginAt).toBe('2026-06-01T08:00:00Z')
    expect(result.data?.lastActivityAt).toBe('2026-06-18T10:00:00Z')
    expect(result.data?.daysSinceActivity).toBe(2)
    expect(result.data?.isInactive).toBe(false)
  })

  it('flague isInactive au-delà du seuil de 7 jours', async () => {
    tableResults.clients = { data: { first_login_at: '2026-05-01T08:00:00Z' }, error: null }
    tableResults.client_parcours_agents = { data: { updated_at: '2026-06-01T10:00:00Z' }, error: null }
    tableResults.step_submissions = { data: null, error: null }

    const { getClientActivitySnapshot } = await import('./get-client-activity-snapshot')
    const result = await getClientActivitySnapshot(VALID_ID)

    expect(result.data?.daysSinceActivity).toBe(19)
    expect(result.data?.isInactive).toBe(true)
  })
})

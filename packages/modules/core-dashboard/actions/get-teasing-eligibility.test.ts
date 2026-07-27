import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getTeasingEligibility } from './get-teasing-eligibility'

const mockSupabase = {
  from: vi.fn(),
}

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabase)),
  // Reproduit le vrai comportement : seuls ces deux statuts ferment l'écriture.
  isReadOnlyClientStatus: (status?: string | null) =>
    status === 'subscription_cancelled' || status === 'handed_off',
}))

function makeSelectChain(result: { data: unknown; error: unknown }) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  }
}

/**
 * Mock routé PAR TABLE, et non par ordre d'appel.
 *
 * La version précédente enchaînait des `mockReturnValueOnce` dans l'ordre supposé des
 * requêtes : ajouter une lecture en amont (ici le statut du client) décalait toute la
 * séquence et cassait les 7 tests d'un coup, sans que le comportement testé ait changé.
 * Router par nom de table rend ces tests indifférents à l'ordre et au nombre de requêtes.
 */
function mockTables(tables: Record<string, { data: unknown; error: unknown }>) {
  mockSupabase.from.mockImplementation((table: string) =>
    makeSelectChain(tables[table] ?? { data: null, error: null })
  )
}

const CLIENT_ACTIF = { data: { status: 'active' }, error: null }

describe('getTeasingEligibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns error when clientId is empty', async () => {
    const result = await getTeasingEligibility('')
    expect(result.error).toBeTruthy()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.data).toBeNull()
  })

  it('returns showTeasing: false when show_lab_teasing is false in config', async () => {
    mockTables({
      clients: CLIENT_ACTIF,
      client_configs: { data: { show_lab_teasing: false }, error: null },
    })

    const result = await getTeasingEligibility('client-uuid')
    expect(result.data?.showTeasing).toBe(false)
    expect(result.error).toBeNull()
  })

  it('returns showTeasing: false when there is an active parcours (en_cours)', async () => {
    mockTables({
      clients: CLIENT_ACTIF,
      client_configs: { data: { show_lab_teasing: true }, error: null },
      parcours: { data: { status: 'en_cours' }, error: null },
    })

    const result = await getTeasingEligibility('client-uuid')
    expect(result.data?.showTeasing).toBe(false)
    expect(result.error).toBeNull()
  })

  it('returns showTeasing: true when no active parcours and config allows', async () => {
    mockTables({
      clients: CLIENT_ACTIF,
      client_configs: { data: { show_lab_teasing: true }, error: null },
      parcours: { data: null, error: null },
    })

    const result = await getTeasingEligibility('client-uuid')
    expect(result.data?.showTeasing).toBe(true)
    expect(result.error).toBeNull()
  })

  it('returns showTeasing: true when parcours is completed (termine)', async () => {
    // La query est filtrée sur status='en_cours' — un parcours terminé ne matche pas
    // donc la DB retourne null (aucun en_cours trouvé)
    mockTables({
      clients: CLIENT_ACTIF,
      client_configs: { data: { show_lab_teasing: true }, error: null },
      parcours: { data: null, error: null },
    })

    const result = await getTeasingEligibility('client-uuid')
    expect(result.data?.showTeasing).toBe(true)
    expect(result.error).toBeNull()
  })

  it('returns showTeasing: true when config record not found (defaults)', async () => {
    mockTables({
      clients: CLIENT_ACTIF,
      client_configs: { data: null, error: null },
      parcours: { data: null, error: null },
    })

    const result = await getTeasingEligibility('client-uuid')
    expect(result.data?.showTeasing).toBe(true)
    expect(result.error).toBeNull()
  })

  it('returns error when parcours query fails', async () => {
    mockTables({
      clients: CLIENT_ACTIF,
      client_configs: { data: { show_lab_teasing: true }, error: null },
      parcours: { data: null, error: { message: 'DB parcours error', code: 'DB_ERROR' } },
    })

    const result = await getTeasingEligibility('client-uuid')
    expect(result.error).toBeTruthy()
    expect(result.data).toBeNull()
  })

  it('returns error on DB failure for config query', async () => {
    mockTables({
      clients: CLIENT_ACTIF,
      client_configs: { data: null, error: { message: 'DB error', code: 'DB_ERROR' } },
    })

    const result = await getTeasingEligibility('client-uuid')
    expect(result.error).toBeTruthy()
    expect(result.data).toBeNull()
  })

  // ── Abonnement terminé ───────────────────────────────────────────────────────
  // Le teasing invite à découvrir le Lab et à s'y lancer : le proposer à un client
  // dont le parcours vient d'être figé, c'est promettre une action impossible.

  it.each(['subscription_cancelled', 'handed_off'])(
    'returns showTeasing: false when client status is %s',
    async (status) => {
      mockTables({
        clients: { data: { status }, error: null },
        // Config et parcours diraient « affiche le teasing » : le statut prime.
        client_configs: { data: { show_lab_teasing: true }, error: null },
        parcours: { data: null, error: null },
      })

      const result = await getTeasingEligibility('client-uuid')
      expect(result.data?.showTeasing).toBe(false)
      expect(result.error).toBeNull()
    }
  )

  it('still shows teasing for a suspended client (only cancelled/handed_off are excluded)', async () => {
    mockTables({
      clients: { data: { status: 'suspended' }, error: null },
      client_configs: { data: { show_lab_teasing: true }, error: null },
      parcours: { data: null, error: null },
    })

    const result = await getTeasingEligibility('client-uuid')
    expect(result.data?.showTeasing).toBe(true)
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockOperatorSingle = vi.fn()
const mockConfigUpdateEq = vi.fn()
const mockActivityInsert = vi.fn()

// Capture des updates sur client_parcours_agents
const agentUpdateCalls: Array<{ payload: Record<string, unknown>; filter: string; ids?: string[]; status?: string; enabled?: boolean }> = []
// Données d'étapes renvoyées par le SELECT (mode tracé)
let agentRows: Array<{ id: string; step_order: number; status: string; is_enabled: boolean }> = []

function makeAgentChain() {
  // .update(payload) → objet avec .eq()/.in()/.select() selon le scénario
  return {
    update: (payload: Record<string, unknown>) => ({
      // libre : .eq(client).eq(is_enabled).eq(status='pending').select()
      eq: (col: string, val: unknown) => ({
        eq: (col2: string, val2: unknown) => ({
          eq: (col3: string, val3: unknown) => ({
            select: () => {
              agentUpdateCalls.push({ payload, filter: 'libre-bulk', status: String(val3) })
              return Promise.resolve({ data: [{ id: 's-pending' }], error: null })
            },
          }),
        }),
      }),
      // tracé : .in('id', [...])
      in: (col: string, ids: string[]) => {
        agentUpdateCalls.push({ payload, filter: 'in', ids, status: String(payload.status) })
        return Promise.resolve({ error: null })
      },
    }),
    select: () => ({
      eq: () => ({
        order: () => Promise.resolve({ data: agentRows, error: null }),
      }),
    }),
  }
}

const mockFrom = vi.fn((table: string) => {
  if (table === 'operators') {
    return { select: () => ({ eq: () => ({ single: mockOperatorSingle }) }) }
  }
  if (table === 'client_configs') {
    return { update: () => ({ eq: mockConfigUpdateEq }) }
  }
  if (table === 'client_parcours_agents') {
    return makeAgentChain()
  }
  if (table === 'activity_logs') {
    return { insert: mockActivityInsert }
  }
  return {}
})

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

const CLIENT_ID = '00000000-0000-0000-0000-000000000001'

describe('setParcoursMode Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    agentUpdateCalls.length = 0
    agentRows = []
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null })
    mockOperatorSingle.mockResolvedValue({ data: { id: 'op-1' }, error: null })
    mockConfigUpdateEq.mockResolvedValue({ error: null })
    mockActivityInsert.mockResolvedValue({ error: null })
  })

  it('returns UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'x' } })
    const { setParcoursMode } = await import('./set-parcours-mode')
    const result = await setParcoursMode({ clientId: CLIENT_ID, mode: 'libre' })
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for an invalid mode', async () => {
    const { setParcoursMode } = await import('./set-parcours-mode')
    // @ts-expect-error test d'un mode invalide
    const result = await setParcoursMode({ clientId: CLIENT_ID, mode: 'sequentiel' })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('libre — déverrouille les étapes pending en un seul update bulk', async () => {
    const { setParcoursMode } = await import('./set-parcours-mode')
    const result = await setParcoursMode({ clientId: CLIENT_ID, mode: 'libre' })

    expect(result.error).toBeNull()
    expect(result.data?.mode).toBe('libre')
    // un update bulk qui passe les pending → active
    const bulk = agentUpdateCalls.find((c) => c.filter === 'libre-bulk')
    expect(bulk).toBeDefined()
    expect(bulk?.payload.status).toBe('active')
  })

  it('tracé — re-verrouille : 1ère non terminée active, suivantes ouvertes repassent pending', async () => {
    // étape 1 terminée, étapes 2 et 3 ouvertes (active) en parallèle (héritage mode libre)
    agentRows = [
      { id: 's1', step_order: 1, status: 'completed', is_enabled: true },
      { id: 's2', step_order: 2, status: 'active', is_enabled: true },
      { id: 's3', step_order: 3, status: 'active', is_enabled: true },
    ]
    const { setParcoursMode } = await import('./set-parcours-mode')
    const result = await setParcoursMode({ clientId: CLIENT_ID, mode: 'tracee' })

    expect(result.error).toBeNull()
    // s2 garde le focus (déjà active → aucun update d'activation nécessaire),
    // s3 doit être re-verrouillée en pending.
    const lock = agentUpdateCalls.find((c) => c.status === 'pending')
    expect(lock?.ids).toContain('s3')
    expect(lock?.ids).not.toContain('s2')
  })

  it('tracé — la 1ère non terminée en pending est (ré)activée', async () => {
    agentRows = [
      { id: 's1', step_order: 1, status: 'completed', is_enabled: true },
      { id: 's2', step_order: 2, status: 'pending', is_enabled: true },
      { id: 's3', step_order: 3, status: 'pending', is_enabled: true },
    ]
    const { setParcoursMode } = await import('./set-parcours-mode')
    await setParcoursMode({ clientId: CLIENT_ID, mode: 'tracee' })

    const activate = agentUpdateCalls.find((c) => c.status === 'active')
    expect(activate?.ids).toContain('s2')
    // s3 reste pending (pas d'update nécessaire car déjà pending)
  })

  it('tracé — une étape désactivée n’est jamais touchée', async () => {
    agentRows = [
      { id: 's1', step_order: 1, status: 'completed', is_enabled: true },
      { id: 's2', step_order: 2, status: 'active', is_enabled: false }, // désactivée
      { id: 's3', step_order: 3, status: 'active', is_enabled: true },
    ]
    const { setParcoursMode } = await import('./set-parcours-mode')
    await setParcoursMode({ clientId: CLIENT_ID, mode: 'tracee' })

    // s3 devient le focus (1ère enabled non terminée) → reste active, pas re-verrouillée.
    // s2 désactivée ne doit apparaître dans aucun update.
    const allIds = agentUpdateCalls.flatMap((c) => c.ids ?? [])
    expect(allIds).not.toContain('s2')
  })
})

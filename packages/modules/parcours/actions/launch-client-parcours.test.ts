import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockInsert = vi.fn()
const mockClientsSelectSingle = vi.fn()
const mockConfigSelectSingle = vi.fn()
const mockEnsureClientAuthAccount = vi.fn()

// from() router : selon la table appelée, on retourne la chaîne attendue.
const mockFrom = vi.fn((table: string) => {
  if (table === 'clients') {
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: mockClientsSelectSingle,
        }),
      }),
    }
  }
  // LOT E — lecture du mode de parcours sur client_configs avant l'INSERT.
  if (table === 'client_configs') {
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: mockConfigSelectSingle,
        }),
      }),
    }
  }
  // client_parcours_agents + notifications + client_concierge_messages → .insert()
  return { insert: mockInsert }
})

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

vi.mock('@monprojetpro/supabase/admin', () => ({
  ensureClientAuthAccount: mockEnsureClientAuthAccount,
}))

const CLIENT_ID = '00000000-0000-0000-0000-000000000001'
const AGENT_ID_A = '00000000-0000-0000-0000-000000000010'
const AGENT_ID_B = '00000000-0000-0000-0000-000000000011'

describe('launchClientParcours Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null })
    mockInsert.mockResolvedValue({ error: null })
    // Défaut : mode tracé (étape 1 active, suivantes pending).
    mockConfigSelectSingle.mockResolvedValue({ data: { parcours_mode: 'tracee' }, error: null })
    // Défaut : le compte existe déjà (T-067 — créé à l'activation, avant le lancement).
    mockClientsSelectSingle.mockResolvedValue({
      data: { auth_user_id: 'auth-client-1', email: 'client@example.com' },
      error: null,
    })
  })

  it('returns UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } })
    const { launchClientParcours } = await import('./launch-client-parcours')
    const result = await launchClientParcours({ clientId: CLIENT_ID, steps: [{ agentId: AGENT_ID_A, stepLabel: 'Étape 1' }] })
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for invalid clientId', async () => {
    const { launchClientParcours } = await import('./launch-client-parcours')
    const result = await launchClientParcours({ clientId: 'not-uuid', steps: [{ agentId: AGENT_ID_A, stepLabel: 'Étape 1' }] })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns VALIDATION_ERROR for empty steps array', async () => {
    const { launchClientParcours } = await import('./launch-client-parcours')
    const result = await launchClientParcours({ clientId: CLIENT_ID, steps: [] })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('inserts steps with step 1 in active and subsequent steps in pending', async () => {
    const { launchClientParcours } = await import('./launch-client-parcours')
    const result = await launchClientParcours({
      clientId: CLIENT_ID,
      steps: [
        { agentId: AGENT_ID_A, stepLabel: 'Identité de marque' },
        { agentId: AGENT_ID_B, stepLabel: 'Positionnement' },
      ],
    })

    expect(result.error).toBeNull()
    expect(result.data?.count).toBe(2)

    // Trouver le premier appel insert sur client_parcours_agents (array de rows)
    const stepsInsertCall = mockInsert.mock.calls.find(call => Array.isArray(call[0]))
    expect(stepsInsertCall).toBeDefined()
    const insertedSteps = stepsInsertCall![0]

    expect(insertedSteps[0].step_order).toBe(1)
    expect(insertedSteps[1].step_order).toBe(2)
    expect(insertedSteps[0].elio_lab_agent_id).toBe(AGENT_ID_A)
    expect(insertedSteps[1].elio_lab_agent_id).toBe(AGENT_ID_B)

    // Kit Complet : étape 1 = active (sinon le client ne peut rien faire), suivantes = pending
    expect(insertedSteps[0].status).toBe('active')
    expect(insertedSteps[1].status).toBe('pending')
  })

  it('LOT E — en mode libre, TOUTES les étapes sont insérées en active', async () => {
    mockConfigSelectSingle.mockResolvedValue({ data: { parcours_mode: 'libre' }, error: null })
    const { launchClientParcours } = await import('./launch-client-parcours')
    const result = await launchClientParcours({
      clientId: CLIENT_ID,
      steps: [
        { agentId: AGENT_ID_A, stepLabel: 'Identité de marque' },
        { agentId: AGENT_ID_B, stepLabel: 'Positionnement' },
      ],
    })

    expect(result.error).toBeNull()
    const stepsInsertCall = mockInsert.mock.calls.find(call => Array.isArray(call[0]))
    const insertedSteps = stepsInsertCall![0]
    expect(insertedSteps[0].status).toBe('active')
    expect(insertedSteps[1].status).toBe('active')
  })

  it('inserts a notification for the client when parcours is launched', async () => {
    const { launchClientParcours } = await import('./launch-client-parcours')
    await launchClientParcours({
      clientId: CLIENT_ID,
      steps: [{ agentId: AGENT_ID_A, stepLabel: 'Identité de marque' }],
    })

    // Le second insert (après celui sur client_parcours_agents) doit être la notification client
    const notifInsertCall = mockInsert.mock.calls.find(
      call => !Array.isArray(call[0]) && call[0]?.recipient_type === 'client'
    )
    expect(notifInsertCall).toBeDefined()
    expect(notifInsertCall![0]).toMatchObject({
      recipient_type: 'client',
      recipient_id: 'auth-client-1',
      type: 'parcours',
      link: '/modules/parcours/steps/1',
    })
    // T-067 — le compte existe déjà (créé à l'activation) : pas de filet de sécurité déclenché.
    expect(mockEnsureClientAuthAccount).not.toHaveBeenCalled()
  })

  it('skips the notification gracefully when the client has no auth_user_id and no email', async () => {
    mockClientsSelectSingle.mockResolvedValue({ data: null, error: null })
    const { launchClientParcours } = await import('./launch-client-parcours')
    const result = await launchClientParcours({
      clientId: CLIENT_ID,
      steps: [{ agentId: AGENT_ID_A, stepLabel: 'Étape 1' }],
    })
    expect(result.error).toBeNull()
    // Pas de NOTIFICATION client (le mot d'Élio Concierge, lui, peut s'insérer séparément)
    const notifCall = mockInsert.mock.calls.find(
      call => !Array.isArray(call[0]) && call[0]?.recipient_type === 'client'
    )
    expect(notifCall).toBeUndefined()
  })

  // ── Filet de sécurité — compte toujours absent au lancement (chemin legacy) ──

  it('falls back to ensureClientAuthAccount when the client still has no account at launch time', async () => {
    mockClientsSelectSingle.mockResolvedValue({
      data: { auth_user_id: null, email: 'nouveau@example.com' },
      error: null,
    })
    mockEnsureClientAuthAccount.mockResolvedValue({ authUserId: 'new-auth-id', created: true, error: null })
    const { launchClientParcours } = await import('./launch-client-parcours')
    const result = await launchClientParcours({
      clientId: CLIENT_ID,
      steps: [{ agentId: AGENT_ID_A, stepLabel: 'Étape 1' }],
    })

    expect(result.error).toBeNull()
    expect(mockEnsureClientAuthAccount).toHaveBeenCalledWith({
      supabase: expect.anything(),
      clientId: CLIENT_ID,
      email: 'nouveau@example.com',
      authUserId: null,
    })

    const notifInsertCall = mockInsert.mock.calls.find(
      call => !Array.isArray(call[0]) && call[0]?.recipient_type === 'client'
    )
    expect(notifInsertCall![0]).toMatchObject({ recipient_id: 'new-auth-id' })
  })

  it('does not attempt to create an account when the client has no email either', async () => {
    mockClientsSelectSingle.mockResolvedValue({
      data: { auth_user_id: null, email: null },
      error: null,
    })
    const { launchClientParcours } = await import('./launch-client-parcours')
    const result = await launchClientParcours({
      clientId: CLIENT_ID,
      steps: [{ agentId: AGENT_ID_A, stepLabel: 'Étape 1' }],
    })
    expect(result.error).toBeNull()
    expect(mockEnsureClientAuthAccount).not.toHaveBeenCalled()
  })

  it('does not fail the launch when the auth account creation fails (logged only)', async () => {
    mockClientsSelectSingle.mockResolvedValue({
      data: { auth_user_id: null, email: 'echec@example.com' },
      error: null,
    })
    mockEnsureClientAuthAccount.mockResolvedValue({
      authUserId: null,
      created: false,
      error: { code: 'AUTH_ADMIN_CREATE_FAILED', message: 'boom' },
    })
    const { launchClientParcours } = await import('./launch-client-parcours')
    const result = await launchClientParcours({
      clientId: CLIENT_ID,
      steps: [{ agentId: AGENT_ID_A, stepLabel: 'Étape 1' }],
    })
    expect(result.error).toBeNull()
    expect(result.data?.count).toBe(1)
    // Pas de compte → pas de notification client, mais le lancement n'échoue pas.
    const notifCall = mockInsert.mock.calls.find(
      call => !Array.isArray(call[0]) && call[0]?.recipient_type === 'client'
    )
    expect(notifCall).toBeUndefined()
  })

  it('returns DB_ERROR when insert fails', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'DB error' } })
    const { launchClientParcours } = await import('./launch-client-parcours')
    const result = await launchClientParcours({
      clientId: CLIENT_ID,
      steps: [{ agentId: AGENT_ID_A, stepLabel: 'Étape 1' }],
    })
    expect(result.error?.code).toBe('DB_ERROR')
  })
})

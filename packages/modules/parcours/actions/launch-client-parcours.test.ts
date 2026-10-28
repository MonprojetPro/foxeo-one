import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockInsert = vi.fn()
const mockClientsSelectSingle = vi.fn()
const mockClientsUpdateEq = vi.fn()
const mockConfigSelectSingle = vi.fn()
const mockSendInvite = vi.fn()
const mockCreateClientAuthUser = vi.fn()

// from() router : selon la table appelée, on retourne la chaîne attendue.
const mockFrom = vi.fn((table: string) => {
  if (table === 'clients') {
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: mockClientsSelectSingle,
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: mockClientsUpdateEq,
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

// LOT C — l'envoi de l'invitation est isolé dans un util mocké ici.
vi.mock('../utils/send-welcome-lab-invite', () => ({
  sendWelcomeLabInvite: mockSendInvite,
}))

vi.mock('@monprojetpro/supabase/admin', () => ({
  createClientAuthUser: mockCreateClientAuthUser,
  generateSecureTemporaryPassword: vi.fn(() => 'temp-password-fake'),
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
    // Par défaut : client jamais connecté (first_login_at null) → invitation attendue.
    mockClientsSelectSingle.mockResolvedValue({
      data: {
        auth_user_id: 'auth-client-1',
        email: 'client@example.com',
        name: 'ACME SARL',
        first_login_at: null,
      },
      error: null,
    })
    mockSendInvite.mockResolvedValue({ success: true })
    mockClientsUpdateEq.mockResolvedValue({ error: null })
    mockCreateClientAuthUser.mockResolvedValue({ userId: 'new-auth-id', error: null })
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
  })

  it('skips the notification gracefully when the client has no auth_user_id', async () => {
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

  // ── LOT C — Email d'invitation au lancement ──────────────────────────────────

  it('sends the welcome-lab invite to a first-time client (first_login_at null)', async () => {
    const { launchClientParcours } = await import('./launch-client-parcours')
    await launchClientParcours({
      clientId: CLIENT_ID,
      steps: [
        { agentId: AGENT_ID_A, stepLabel: 'Identité de marque' },
        { agentId: AGENT_ID_B, stepLabel: 'Positionnement' },
      ],
    })

    expect(mockSendInvite).toHaveBeenCalledTimes(1)
    expect(mockSendInvite).toHaveBeenCalledWith({
      email: 'client@example.com',
      clientName: 'ACME SARL',
      firstStepLabel: 'Identité de marque',
    })
  })

  it('does NOT send the invite if the client already logged in (additional parcours)', async () => {
    mockClientsSelectSingle.mockResolvedValue({
      data: {
        auth_user_id: 'auth-client-1',
        email: 'client@example.com',
        name: 'ACME SARL',
        first_login_at: '2026-06-01T10:00:00Z',
      },
      error: null,
    })
    const { launchClientParcours } = await import('./launch-client-parcours')
    await launchClientParcours({
      clientId: CLIENT_ID,
      steps: [{ agentId: AGENT_ID_A, stepLabel: 'Étape 1' }],
    })
    expect(mockSendInvite).not.toHaveBeenCalled()
  })

  it('does NOT send the invite when the client has no email', async () => {
    mockClientsSelectSingle.mockResolvedValue({
      data: { auth_user_id: 'auth-client-1', email: null, name: 'ACME SARL', first_login_at: null },
      error: null,
    })
    const { launchClientParcours } = await import('./launch-client-parcours')
    await launchClientParcours({
      clientId: CLIENT_ID,
      steps: [{ agentId: AGENT_ID_A, stepLabel: 'Étape 1' }],
    })
    expect(mockSendInvite).not.toHaveBeenCalled()
  })

  it('does not fail the launch and alerts the operator when the invite fails', async () => {
    mockSendInvite.mockResolvedValue({ success: false, error: 'SMTP down' })
    const { launchClientParcours } = await import('./launch-client-parcours')
    const result = await launchClientParcours({
      clientId: CLIENT_ID,
      steps: [{ agentId: AGENT_ID_A, stepLabel: 'Étape 1' }],
    })

    expect(result.error).toBeNull()
    // Une notification opérateur (alerte) doit être insérée vers l'opérateur courant.
    const operatorAlert = mockInsert.mock.calls.find(
      call => !Array.isArray(call[0]) && call[0]?.recipient_type === 'operator' && call[0]?.type === 'alert'
    )
    expect(operatorAlert).toBeDefined()
    expect(operatorAlert![0]).toMatchObject({
      recipient_type: 'operator',
      recipient_id: 'user-id',
      link: `/modules/crm/clients/${CLIENT_ID}`,
    })
  })

  // ── Fix T-065bis — compte auth créé si absent au lancement ──────────────────

  it('creates the auth account and links it when the client has none yet', async () => {
    mockClientsSelectSingle.mockResolvedValue({
      data: {
        auth_user_id: null,
        email: 'nouveau@example.com',
        name: 'Nouveau Client',
        first_login_at: null,
      },
      error: null,
    })
    const { launchClientParcours } = await import('./launch-client-parcours')
    const result = await launchClientParcours({
      clientId: CLIENT_ID,
      steps: [{ agentId: AGENT_ID_A, stepLabel: 'Étape 1' }],
    })

    expect(result.error).toBeNull()
    expect(mockCreateClientAuthUser).toHaveBeenCalledWith({
      email: 'nouveau@example.com',
      password: 'temp-password-fake',
    })
    expect(mockClientsUpdateEq).toHaveBeenCalledWith('id', CLIENT_ID)

    // La notification client et l'invitation utilisent bien le compte fraîchement créé.
    const notifInsertCall = mockInsert.mock.calls.find(
      call => !Array.isArray(call[0]) && call[0]?.recipient_type === 'client'
    )
    expect(notifInsertCall![0]).toMatchObject({ recipient_id: 'new-auth-id' })
    expect(mockSendInvite).toHaveBeenCalledWith({
      email: 'nouveau@example.com',
      clientName: 'Nouveau Client',
      firstStepLabel: 'Étape 1',
    })
  })

  it('does not attempt to create an account when the client has no email either', async () => {
    mockClientsSelectSingle.mockResolvedValue({
      data: { auth_user_id: null, email: null, name: 'Sans email', first_login_at: null },
      error: null,
    })
    const { launchClientParcours } = await import('./launch-client-parcours')
    const result = await launchClientParcours({
      clientId: CLIENT_ID,
      steps: [{ agentId: AGENT_ID_A, stepLabel: 'Étape 1' }],
    })
    expect(result.error).toBeNull()
    expect(mockCreateClientAuthUser).not.toHaveBeenCalled()
  })

  it('still notifies the client when the account is created but linking clients.auth_user_id fails', async () => {
    mockClientsSelectSingle.mockResolvedValue({
      data: {
        auth_user_id: null,
        email: 'non-lie@example.com',
        name: 'Non Lié',
        first_login_at: null,
      },
      error: null,
    })
    mockClientsUpdateEq.mockResolvedValue({ error: { message: 'update failed' } })
    const { launchClientParcours } = await import('./launch-client-parcours')
    const result = await launchClientParcours({
      clientId: CLIENT_ID,
      steps: [{ agentId: AGENT_ID_A, stepLabel: 'Étape 1' }],
    })

    expect(result.error).toBeNull()
    // Le compte a bien été créé, la notification part quand même via la variable locale —
    // seul le lien en base a échoué (consigné en log pour ATLAS/ops).
    const notifInsertCall = mockInsert.mock.calls.find(
      call => !Array.isArray(call[0]) && call[0]?.recipient_type === 'client'
    )
    expect(notifInsertCall![0]).toMatchObject({ recipient_id: 'new-auth-id' })
  })

  it('does not fail the launch when the auth account creation fails (logged only)', async () => {
    mockClientsSelectSingle.mockResolvedValue({
      data: {
        auth_user_id: null,
        email: 'echec@example.com',
        name: 'Echec Client',
        first_login_at: null,
      },
      error: null,
    })
    mockCreateClientAuthUser.mockResolvedValue({
      userId: null,
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

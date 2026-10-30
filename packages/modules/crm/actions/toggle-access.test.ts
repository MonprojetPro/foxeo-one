import { describe, it, expect, vi, beforeEach } from 'vitest'

const testOperatorId = '550e8400-e29b-41d4-a716-446655440000'
const testOperatorDbId = '550e8400-e29b-41d4-a716-446655440010'
const testClientId = '550e8400-e29b-41d4-a716-446655440001'

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock Supabase
const mockOperatorSingle = vi.fn()
const mockConfigSingle = vi.fn()
const mockUpdateEq = vi.fn()
const mockClientsMaybeSingle = vi.fn()
const mockParcoursUpdateSelect = vi.fn()
const mockParcoursUpdateEqStatus = vi.fn(() => ({ select: mockParcoursUpdateSelect }))
const mockParcoursUpdateEqClient = vi.fn(() => ({ eq: mockParcoursUpdateEqStatus }))
const mockParcoursUpdate = vi.fn(() => ({ eq: mockParcoursUpdateEqClient }))
const mockActivityInsert = vi.fn().mockResolvedValue({ error: null })
const mockNotificationInsert = vi.fn().mockResolvedValue({ error: null })

function defaultFromImpl(table: string) {
  if (table === 'operators') {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single: mockOperatorSingle })),
      })),
    }
  }
  if (table === 'client_configs') {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single: mockConfigSingle })),
      })),
      update: vi.fn(() => ({
        eq: mockUpdateEq,
      })),
    }
  }
  if (table === 'clients') {
    return {
      select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: mockClientsMaybeSingle })) })),
    }
  }
  if (table === 'parcours') {
    return { update: mockParcoursUpdate }
  }
  if (table === 'activity_logs') {
    return { insert: mockActivityInsert }
  }
  if (table === 'notifications') {
    return { insert: mockNotificationInsert }
  }
  return {}
}

const mockFrom = vi.fn(defaultFromImpl)

const mockGetUser = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}))

const mockEnsureClientAuthAccount = vi.fn()
const mockSendWelcomeLabInvite = vi.fn()
const mockSendWelcomeOneInvite = vi.fn()

vi.mock('@monprojetpro/supabase/admin', () => ({
  ensureClientAuthAccount: mockEnsureClientAuthAccount,
  sendWelcomeLabInvite: mockSendWelcomeLabInvite,
  sendWelcomeOneInvite: mockSendWelcomeOneInvite,
}))

describe('toggleAccess Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockFrom.mockImplementation(defaultFromImpl)
    // Défaut : le compte existe déjà (cas le plus fréquent) — pas d'email renvoyé.
    mockClientsMaybeSingle.mockResolvedValue({
      data: { id: testClientId, email: 'client@example.com', first_name: 'Jean', name: 'ACME', auth_user_id: 'existing-id' },
      error: null,
    })
    mockEnsureClientAuthAccount.mockResolvedValue({ authUserId: 'existing-id', created: false, error: null })
  })

  it('should return UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not auth' },
    })

    const { toggleAccess } = await import('./toggle-access')
    const result = await toggleAccess({
      clientId: testClientId,
      accessType: 'lab',
      enabled: true,
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should return VALIDATION_ERROR for invalid accessType', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: testOperatorId } },
      error: null,
    })

    const { toggleAccess } = await import('./toggle-access')
    const result = await toggleAccess({
      clientId: testClientId,
      accessType: 'invalid' as 'lab',
      enabled: true,
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should return NOT_FOUND when operator not found', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: testOperatorId } },
      error: null,
    })

    mockOperatorSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

    const { toggleAccess } = await import('./toggle-access')
    const result = await toggleAccess({
      clientId: testClientId,
      accessType: 'lab',
      enabled: true,
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('should toggle lab access and return result', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: testOperatorId } },
      error: null,
    })

    mockOperatorSingle.mockResolvedValue({
      data: { id: testOperatorDbId },
      error: null,
    })

    mockConfigSingle.mockResolvedValue({
      data: { dashboard_type: 'one' },
      error: null,
    })

    mockUpdateEq.mockResolvedValue({ error: null })
    mockParcoursUpdateSelect.mockResolvedValue({ data: [], error: null })

    const { toggleAccess } = await import('./toggle-access')
    const result = await toggleAccess({
      clientId: testClientId,
      accessType: 'lab',
      enabled: true,
    })

    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()
    expect(result.data?.accessType).toBe('lab')
    expect(result.data?.enabled).toBe(true)
    expect(result.data?.dashboardType).toBe('lab')
  })

  it('coupe les agents Lab SANS retirer lab_mode_available (permanence)', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: testOperatorId } },
      error: null,
    })

    mockOperatorSingle.mockResolvedValue({
      data: { id: testOperatorDbId },
      error: null,
    })

    // Client Lab : espace présent, agents actifs, One fermé
    mockConfigSingle.mockResolvedValue({
      data: { dashboard_type: 'lab', lab_mode_available: true, one_mode_available: false, elio_lab_enabled: true },
      error: null,
    })

    mockUpdateEq.mockResolvedValue({ error: null })
    mockParcoursUpdateSelect.mockResolvedValue({ data: [], error: null })

    // Capture le payload d'update envoyé à client_configs
    let capturedUpdate: Record<string, unknown> | null = null
    mockFrom.mockImplementation((table: string) => {
      if (table === 'operators') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockOperatorSingle })) })) }
      }
      if (table === 'client_configs') {
        return {
          select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockConfigSingle })) })),
          update: vi.fn((payload: Record<string, unknown>) => {
            capturedUpdate = payload
            return { eq: mockUpdateEq }
          }),
        }
      }
      if (table === 'parcours') return { update: mockParcoursUpdate }
      if (table === 'activity_logs') return { insert: mockActivityInsert }
      return defaultFromImpl(table)
    })

    const { toggleAccess } = await import('./toggle-access')
    const result = await toggleAccess({
      clientId: testClientId,
      accessType: 'lab',
      enabled: false,
    })

    expect(result.error).toBeNull()
    // One fermé → mode par défaut = lab ; agents coupés ; espace Lab conservé.
    expect(result.data?.dashboardType).toBe('lab')
    expect(capturedUpdate).toMatchObject({
      dashboard_type: 'lab',
      elio_lab_enabled: false,
    })
    // PERMANENCE : on ne remet jamais lab_mode_available à false.
    expect((capturedUpdate as Record<string, unknown>)?.lab_mode_available).toBeUndefined()
  })

  it('déclencher le One met les agents Lab en pause automatiquement (règle 2026-07-16)', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: testOperatorId } },
      error: null,
    })

    mockOperatorSingle.mockResolvedValue({
      data: { id: testOperatorDbId },
      error: null,
    })

    // Client Lab : espace présent, agents ACTIFS, One fermé → on ouvre le One.
    mockConfigSingle.mockResolvedValue({
      data: { dashboard_type: 'lab', lab_mode_available: true, one_mode_available: false, elio_lab_enabled: true },
      error: null,
    })

    mockUpdateEq.mockResolvedValue({ error: null })
    mockParcoursUpdateSelect.mockResolvedValue({ data: [{ id: 'p-1' }], error: null })

    let capturedUpdate: Record<string, unknown> | null = null
    mockFrom.mockImplementation((table: string) => {
      if (table === 'operators') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockOperatorSingle })) })) }
      }
      if (table === 'client_configs') {
        return {
          select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockConfigSingle })) })),
          update: vi.fn((payload: Record<string, unknown>) => {
            capturedUpdate = payload
            return { eq: mockUpdateEq }
          }),
        }
      }
      if (table === 'parcours') return { update: mockParcoursUpdate }
      if (table === 'activity_logs') return { insert: mockActivityInsert }
      return defaultFromImpl(table)
    })

    const { toggleAccess } = await import('./toggle-access')
    const result = await toggleAccess({
      clientId: testClientId,
      accessType: 'one',
      enabled: true,
    })

    expect(result.error).toBeNull()
    // One ouvert ⇒ agents Lab coupés dans le MÊME update (« sauf si j'en décide autrement »
    // = le switch reste dispo pour les rallumer ensuite).
    expect(capturedUpdate).toMatchObject({
      dashboard_type: 'one',
      one_mode_available: true,
      elio_lab_enabled: false,
    })
    expect(result.data?.labAutoPaused).toBe(true)
    // Le parcours en cours est suspendu, comme pour une coupure manuelle des agents.
    expect(result.data?.parcoursSuspended).toBe(true)
    expect(mockParcoursUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'suspendu' })
    )
  })

  it('déclencher le One ne touche pas aux agents déjà coupés (pas de faux labAutoPaused)', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: testOperatorId } },
      error: null,
    })

    mockOperatorSingle.mockResolvedValue({
      data: { id: testOperatorDbId },
      error: null,
    })

    // Agents déjà en pause → ouvrir le One ne doit rien « re-pauser ».
    mockConfigSingle.mockResolvedValue({
      data: { dashboard_type: 'lab', lab_mode_available: true, one_mode_available: false, elio_lab_enabled: false },
      error: null,
    })

    mockUpdateEq.mockResolvedValue({ error: null })
    mockParcoursUpdateSelect.mockResolvedValue({ data: [], error: null })

    const { toggleAccess } = await import('./toggle-access')
    const result = await toggleAccess({
      clientId: testClientId,
      accessType: 'one',
      enabled: true,
    })

    expect(result.error).toBeNull()
    expect(result.data?.labAutoPaused).toBe(false)
    // Pas de suspension de parcours déclenchée par cette ouverture.
    expect(mockParcoursUpdate).not.toHaveBeenCalled()
  })

  // ── T-067 — compte client garanti quand un accès est accordé ────────────────

  it('creates the account and sends welcome-one when One access is granted to a new account', async () => {
    mockConfigSingle.mockResolvedValue({
      data: { dashboard_type: 'lab', lab_mode_available: false, one_mode_available: false, elio_lab_enabled: false },
      error: null,
    })
    mockClientsMaybeSingle.mockResolvedValue({
      data: { id: testClientId, email: 'nouveau@example.com', first_name: 'Jean', name: 'ACME', auth_user_id: null },
      error: null,
    })
    mockEnsureClientAuthAccount.mockResolvedValue({ authUserId: 'new-id', created: true, error: null })
    mockSendWelcomeOneInvite.mockResolvedValue({ success: true })

    const { toggleAccess } = await import('./toggle-access')
    const result = await toggleAccess({ clientId: testClientId, accessType: 'one', enabled: true })

    expect(result.error).toBeNull()
    expect(mockEnsureClientAuthAccount).toHaveBeenCalledWith({
      supabase: expect.anything(),
      clientId: testClientId,
      email: 'nouveau@example.com',
      authUserId: null,
    })
    expect(mockSendWelcomeOneInvite).toHaveBeenCalledWith({ email: 'nouveau@example.com', clientName: 'Jean' })
    expect(mockSendWelcomeLabInvite).not.toHaveBeenCalled()
  })

  it('sends welcome-lab (not welcome-one) when Lab agents are reactivated for a new account', async () => {
    mockConfigSingle.mockResolvedValue({
      data: { dashboard_type: 'lab', lab_mode_available: false, one_mode_available: false, elio_lab_enabled: false },
      error: null,
    })
    mockClientsMaybeSingle.mockResolvedValue({
      data: { id: testClientId, email: 'nouveau@example.com', first_name: 'Jean', name: 'ACME', auth_user_id: null },
      error: null,
    })
    mockEnsureClientAuthAccount.mockResolvedValue({ authUserId: 'new-id', created: true, error: null })
    mockSendWelcomeLabInvite.mockResolvedValue({ success: true })

    const { toggleAccess } = await import('./toggle-access')
    await toggleAccess({ clientId: testClientId, accessType: 'lab', enabled: true })

    expect(mockSendWelcomeLabInvite).toHaveBeenCalledWith({ email: 'nouveau@example.com', clientName: 'Jean' })
    expect(mockSendWelcomeOneInvite).not.toHaveBeenCalled()
  })

  it('does not create an account nor send an email when access is turned off', async () => {
    mockConfigSingle.mockResolvedValue({
      data: { dashboard_type: 'lab', lab_mode_available: true, one_mode_available: true, elio_lab_enabled: false },
      error: null,
    })

    const { toggleAccess } = await import('./toggle-access')
    await toggleAccess({ clientId: testClientId, accessType: 'one', enabled: false })

    expect(mockEnsureClientAuthAccount).not.toHaveBeenCalled()
  })

  it('does not resend an email when the account already existed', async () => {
    mockConfigSingle.mockResolvedValue({
      data: { dashboard_type: 'lab', lab_mode_available: false, one_mode_available: false, elio_lab_enabled: false },
      error: null,
    })

    const { toggleAccess } = await import('./toggle-access')
    await toggleAccess({ clientId: testClientId, accessType: 'one', enabled: true })

    expect(mockSendWelcomeOneInvite).not.toHaveBeenCalled()
  })

  it('should always return { data, error } format', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Error' },
    })

    const { toggleAccess } = await import('./toggle-access')
    const result = await toggleAccess({
      clientId: testClientId,
      accessType: 'lab',
      enabled: true,
    })

    expect(result).toHaveProperty('data')
    expect(result).toHaveProperty('error')
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock chains ─────────────────────────────────────────────────────────────

const mockGetUser = vi.fn()

// operators (guard)
const mockOperatorSingle = vi.fn()
const mockOperatorEq = vi.fn(() => ({ single: mockOperatorSingle }))
const mockOperatorSelect = vi.fn(() => ({ eq: mockOperatorEq }))

// client_parcours_agents select (get agent) — .eq('id').eq('client_id').single()
const mockAgentSingle = vi.fn()
const mockAgentEqClient = vi.fn(() => ({ single: mockAgentSingle }))
const mockAgentEqId = vi.fn(() => ({ eq: mockAgentEqClient }))
const mockAgentSelect = vi.fn(() => ({ eq: mockAgentEqId }))

// client_parcours_agents update — .eq('id').eq('client_id')
const mockAgentUpdateEqClient = vi.fn(() => ({ error: null }))
const mockAgentUpdateEqId = vi.fn(() => ({ eq: mockAgentUpdateEqClient }))
const mockAgentUpdate = vi.fn(() => ({ eq: mockAgentUpdateEqId }))

// clients select (auth_user_id)
const mockClientSingle = vi.fn()
const mockClientEq = vi.fn(() => ({ single: mockClientSingle }))
const mockClientSelect = vi.fn(() => ({ eq: mockClientEq }))

// notifications insert
const mockNotifInsert = vi.fn(() => ({}))

// activity_logs insert
const mockLogInsert = vi.fn(() => ({}))

const mockFrom = vi.fn((table: string) => {
  if (table === 'operators') return { select: mockOperatorSelect }
  if (table === 'client_parcours_agents') return { select: mockAgentSelect, update: mockAgentUpdate }
  if (table === 'clients') return { select: mockClientSelect }
  if (table === 'notifications') return { insert: mockNotifInsert }
  if (table === 'activity_logs') return { insert: mockLogInsert }
  return {}
})

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

// Le « mot d'Élio » vivant est testé séparément (generate-concierge-word.test.ts).
// Ici on l'isole : on vérifie juste qu'il est déclenché, sans appeler l'IA.
const mockGenerateConciergeWord = vi.fn().mockResolvedValue({ data: { body: 'ok', source: 'ai' }, error: null })
vi.mock('./generate-concierge-word', () => ({
  generateConciergeWord: (...args: unknown[]) => mockGenerateConciergeWord(...args),
}))

// ─── Constants ──────────────────────────────────────────────────────────────

const AGENT_ID = '00000000-0000-0000-0000-0000000000a1'
const CLIENT_ID = '00000000-0000-0000-0000-0000000000c2'
const AUTH_USER_ID = '00000000-0000-0000-0000-0000000000u3'
const OPERATOR_ID = '00000000-0000-0000-0000-000000000099'

const mockAgent = { id: AGENT_ID, status: 'completed', step_label: 'Élio Go-to-Market' }

function happyPath() {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'operator-user-id' } }, error: null })
  mockOperatorSingle.mockResolvedValue({ data: { id: OPERATOR_ID }, error: null })
  mockAgentSingle.mockResolvedValue({ data: mockAgent, error: null })
  mockClientSingle.mockResolvedValue({ data: { auth_user_id: AUTH_USER_ID }, error: null })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('reopenAgent — guards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    happyPath()
  })

  it('returns UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no auth' } })
    const { reopenAgent } = await import('./reopen-agent')
    const result = await reopenAgent({ agentId: AGENT_ID, clientId: CLIENT_ID })
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns NOT_FOUND when user is not an operator', async () => {
    mockOperatorSingle.mockResolvedValue({ data: null, error: { message: 'none' } })
    const { reopenAgent } = await import('./reopen-agent')
    const result = await reopenAgent({ agentId: AGENT_ID, clientId: CLIENT_ID })
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns VALIDATION_ERROR when params are missing', async () => {
    const { reopenAgent } = await import('./reopen-agent')
    const result = await reopenAgent({ agentId: '', clientId: CLIENT_ID })
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns INVALID_STATUS when agent is not completed', async () => {
    mockAgentSingle.mockResolvedValue({ data: { ...mockAgent, status: 'active' }, error: null })
    const { reopenAgent } = await import('./reopen-agent')
    const result = await reopenAgent({ agentId: AGENT_ID, clientId: CLIENT_ID })
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('INVALID_STATUS')
  })

  it('returns NOT_FOUND when agent does not exist', async () => {
    mockAgentSingle.mockResolvedValue({ data: null, error: { message: 'missing' } })
    const { reopenAgent } = await import('./reopen-agent')
    const result = await reopenAgent({ agentId: AGENT_ID, clientId: CLIENT_ID })
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })
})

describe('reopenAgent — success workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    happyPath()
  })

  it('returns status active on success', async () => {
    const { reopenAgent } = await import('./reopen-agent')
    const result = await reopenAgent({ agentId: AGENT_ID, clientId: CLIENT_ID })
    expect(result.error).toBeNull()
    expect(result.data).toEqual({ agentId: AGENT_ID, status: 'active' })
  })

  it('updates the agent to active, scoped to id AND client_id', async () => {
    const { reopenAgent } = await import('./reopen-agent')
    await reopenAgent({ agentId: AGENT_ID, clientId: CLIENT_ID })
    expect(mockAgentUpdate).toHaveBeenCalledWith({ status: 'active' })
    expect(mockAgentUpdateEqId).toHaveBeenCalledWith('id', AGENT_ID)
    expect(mockAgentUpdateEqClient).toHaveBeenCalledWith('client_id', CLIENT_ID)
  })

  it('notifies the client using auth_user_id (not clients.id) and a valid type', async () => {
    const { reopenAgent } = await import('./reopen-agent')
    await reopenAgent({ agentId: AGENT_ID, clientId: CLIENT_ID })
    expect(mockNotifInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient_type: 'client',
        recipient_id: AUTH_USER_ID,
        type: 'validation',
        link: '/modules/parcours',
      })
    )
  })

  it('includes the reason in the notification body when provided', async () => {
    const { reopenAgent } = await import('./reopen-agent')
    await reopenAgent({ agentId: AGENT_ID, clientId: CLIENT_ID, reason: 'Affine ton positionnement' })
    expect(mockNotifInsert).toHaveBeenCalledWith(
      expect.objectContaining({ body: expect.stringContaining('Affine ton positionnement') })
    )
  })

  it('does not touch any other agent (no cascade)', async () => {
    const { reopenAgent } = await import('./reopen-agent')
    await reopenAgent({ agentId: AGENT_ID, clientId: CLIENT_ID })
    expect(mockAgentUpdate).toHaveBeenCalledTimes(1)
  })

  it('triggers a living Élio word for the reopened agent', async () => {
    const { reopenAgent } = await import('./reopen-agent')
    await reopenAgent({ agentId: AGENT_ID, clientId: CLIENT_ID, reason: 'Affine ton positionnement' })
    expect(mockGenerateConciergeWord).toHaveBeenCalledWith(
      CLIENT_ID,
      expect.objectContaining({ type: 'agent_reopened', agentLabel: 'Élio Go-to-Market', reason: 'Affine ton positionnement' })
    )
  })

  it('logs the reopen in activity_logs', async () => {
    const { reopenAgent } = await import('./reopen-agent')
    await reopenAgent({ agentId: AGENT_ID, clientId: CLIENT_ID })
    expect(mockLogInsert).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'parcours_agent_reopened', entity_id: AGENT_ID })
    )
  })

  it('still succeeds when the client has no auth_user_id (notif skipped)', async () => {
    mockClientSingle.mockResolvedValue({ data: { auth_user_id: null }, error: null })
    const { reopenAgent } = await import('./reopen-agent')
    const result = await reopenAgent({ agentId: AGENT_ID, clientId: CLIENT_ID })
    expect(result.error).toBeNull()
    expect(mockNotifInsert).not.toHaveBeenCalled()
  })
})

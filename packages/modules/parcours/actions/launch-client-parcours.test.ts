import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockInsert = vi.fn()
const mockFrom = vi.fn(() => ({ insert: mockInsert }))

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

const CLIENT_ID = '00000000-0000-0000-0000-000000000001'
const AGENT_ID_A = '00000000-0000-0000-0000-000000000010'
const AGENT_ID_B = '00000000-0000-0000-0000-000000000011'

describe('launchClientParcours Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null })
    mockInsert.mockResolvedValue({ error: null })
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

  it('inserts steps with correct step_order starting at 1', async () => {
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

    const insertCall = mockInsert.mock.calls[0][0]
    expect(insertCall[0].step_order).toBe(1)
    expect(insertCall[1].step_order).toBe(2)
    expect(insertCall[0].elio_lab_agent_id).toBe(AGENT_ID_A)
    expect(insertCall[1].elio_lab_agent_id).toBe(AGENT_ID_B)
    expect(insertCall[0].status).toBe('pending')
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

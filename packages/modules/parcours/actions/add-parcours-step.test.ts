import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockSingle = vi.fn()
const mockSelect = vi.fn(() => ({ single: mockSingle }))
const mockInsert = vi.fn(() => ({ select: mockSelect }))

const mockFetchOrder = vi.fn()
const mockFetchLimit = vi.fn(() => ({ order: mockFetchOrder }))  // wait, let me think

// Chaîne fetch (SELECT step_order max) :
// .from().select().eq().order().limit()
const mockFetchLimitFn = vi.fn()
const mockFetchOrderFn = vi.fn(() => ({ limit: mockFetchLimitFn }))
const mockFetchEqFn = vi.fn(() => ({ order: mockFetchOrderFn }))
const mockFetchSelectFn = vi.fn(() => ({ eq: mockFetchEqFn }))

// Chaîne config (SELECT parcours_mode) :
// .from('client_configs').select().eq().maybeSingle()
const mockConfigMaybeSingle = vi.fn()
const mockConfigEqFn = vi.fn(() => ({ maybeSingle: mockConfigMaybeSingle }))
const mockConfigSelectFn = vi.fn(() => ({ eq: mockConfigEqFn }))

// Chaîne insert (INSERT + select single) :
// .from().insert().select().single()
const mockInsertSingle = vi.fn()
const mockInsertSelect = vi.fn(() => ({ single: mockInsertSingle }))
const mockInsertFn = vi.fn(() => ({ select: mockInsertSelect }))

let parcoursCallCount = 0
const mockFrom = vi.fn((table: string) => {
  if (table === 'client_configs') return { select: mockConfigSelectFn }
  // client_parcours_agents : 1er appel = SELECT max order, 2e = INSERT
  parcoursCallCount++
  if (parcoursCallCount === 1) return { select: mockFetchSelectFn }
  return { insert: mockInsertFn }
})

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

const CLIENT_ID = '00000000-0000-0000-0000-000000000001'
const AGENT_ID = '00000000-0000-0000-0000-000000000010'

describe('addParcoursStep Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    parcoursCallCount = 0
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null })
    mockFetchLimitFn.mockResolvedValue({ data: [{ step_order: 3 }], error: null })
    mockConfigMaybeSingle.mockResolvedValue({ data: { parcours_mode: 'tracee' }, error: null })
    mockInsertSingle.mockResolvedValue({
      data: { id: '00000000-0000-0000-0000-000000000099', step_order: 4 },
      error: null,
    })
  })

  it('returns UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } })
    const { addParcoursStep } = await import('./add-parcours-step')
    const result = await addParcoursStep({ clientId: CLIENT_ID, agentId: AGENT_ID, stepLabel: 'Nouvelle étape' })
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for empty stepLabel', async () => {
    const { addParcoursStep } = await import('./add-parcours-step')
    const result = await addParcoursStep({ clientId: CLIENT_ID, agentId: AGENT_ID, stepLabel: '' })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('appends at max_order + 1 when steps exist', async () => {
    const { addParcoursStep } = await import('./add-parcours-step')
    const result = await addParcoursStep({ clientId: CLIENT_ID, agentId: AGENT_ID, stepLabel: 'Nouvelle étape' })

    expect(result.error).toBeNull()
    expect(result.data?.stepOrder).toBe(4)
    expect(result.data?.id).toBe('00000000-0000-0000-0000-000000000099')
  })

  it('starts at step_order 1 when no steps exist', async () => {
    mockFetchLimitFn.mockResolvedValue({ data: [], error: null })
    mockInsertSingle.mockResolvedValue({
      data: { id: '00000000-0000-0000-0000-000000000099', step_order: 1 },
      error: null,
    })

    const { addParcoursStep } = await import('./add-parcours-step')
    const result = await addParcoursStep({ clientId: CLIENT_ID, agentId: AGENT_ID, stepLabel: 'Première étape' })
    expect(result.data?.stepOrder).toBe(1)
  })

  it("insère en 'active' quand le parcours est en mode libre (règle LOT E)", async () => {
    mockConfigMaybeSingle.mockResolvedValue({ data: { parcours_mode: 'libre' }, error: null })
    const { addParcoursStep } = await import('./add-parcours-step')
    const result = await addParcoursStep({ clientId: CLIENT_ID, agentId: AGENT_ID, stepLabel: 'Étape ajoutée' })

    expect(result.error).toBeNull()
    expect(mockInsertFn).toHaveBeenCalledWith(expect.objectContaining({ status: 'active' }))
  })

  it("insère en 'pending' quand le parcours est en mode tracé", async () => {
    const { addParcoursStep } = await import('./add-parcours-step')
    const result = await addParcoursStep({ clientId: CLIENT_ID, agentId: AGENT_ID, stepLabel: 'Étape ajoutée' })

    expect(result.error).toBeNull()
    expect(mockInsertFn).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending' }))
  })

  it('returns DB_ERROR when insert fails', async () => {
    mockInsertSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } })
    const { addParcoursStep } = await import('./add-parcours-step')
    const result = await addParcoursStep({ clientId: CLIENT_ID, agentId: AGENT_ID, stepLabel: 'Étape' })
    expect(result.error?.code).toBe('DB_ERROR')
  })
})

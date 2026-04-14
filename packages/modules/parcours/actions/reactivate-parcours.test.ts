import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reactivateParcours } from './reactivate-parcours'

// --- Mocks ---

const mockGetUser = vi.fn()

function makeChain() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  chain.select = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.single = vi.fn(() => ({ data: null, error: null }))
  chain.in = vi.fn(() => chain)
  chain.update = vi.fn(() => chain)
  chain.insert = vi.fn(() => ({ data: null, error: null }))
  chain.order = vi.fn(() => chain)
  chain.limit = vi.fn(() => chain)
  return chain
}

let parcoursChain: ReturnType<typeof makeChain>
let activityChain: ReturnType<typeof makeChain>
let clientsChain: ReturnType<typeof makeChain>
let operatorsChain: ReturnType<typeof makeChain>

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === 'parcours') return parcoursChain
      if (table === 'activity_logs') return activityChain
      if (table === 'clients') return clientsChain
      if (table === 'operators') return operatorsChain
      return makeChain()
    },
  })),
}))

vi.mock('../../notifications/actions/create-notification', () => ({
  createNotification: vi.fn(async () => ({ data: { id: 'notif-1' }, error: null })),
}))

const CLIENT_ID = '11111111-1111-1111-1111-111111111111'
const USER_ID = '22222222-2222-2222-2222-222222222222'
const PARCOURS_ID = '33333333-3333-3333-3333-333333333333'
const OPERATOR_ID = '44444444-4444-4444-4444-444444444444'

function setupDefaultMocks() {
  mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null })

  parcoursChain = makeChain()
  activityChain = makeChain()
  clientsChain = makeChain()
  operatorsChain = makeChain()

  // parcours select — returns abandoned parcours
  parcoursChain.single.mockResolvedValue({
    data: { id: PARCOURS_ID, client_id: CLIENT_ID, status: 'abandoned', operator_id: OPERATOR_ID },
    error: null,
  })

  // clients select
  clientsChain.eq.mockReturnValue(clientsChain)
  clientsChain.single.mockResolvedValue({
    data: { id: CLIENT_ID, auth_user_id: 'client-auth-id', name: 'Test Client', operator_id: OPERATOR_ID },
    error: null,
  })

  // operators check
  operatorsChain.eq.mockReturnValue(operatorsChain)
  operatorsChain.single.mockResolvedValue({
    data: { id: OPERATOR_ID, auth_user_id: USER_ID },
    error: null,
  })

  // activity_logs insert
  activityChain.insert.mockReturnValue({ data: null, error: null })
}

describe('reactivateParcours', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no user' } })

    const result = await reactivateParcours({ clientId: CLIENT_ID })

    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for invalid clientId', async () => {
    const result = await reactivateParcours({ clientId: 'bad-uuid' })

    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns FORBIDDEN when user is not an operator', async () => {
    operatorsChain.single.mockResolvedValue({ data: null, error: null })

    const result = await reactivateParcours({ clientId: CLIENT_ID })

    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it('returns NOT_FOUND when parcours does not exist', async () => {
    parcoursChain.single.mockResolvedValue({ data: null, error: { message: 'not found' } })

    const result = await reactivateParcours({ clientId: CLIENT_ID })

    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns PARCOURS_NOT_ABANDONED when status is en_cours', async () => {
    parcoursChain.single.mockResolvedValue({
      data: { id: PARCOURS_ID, client_id: CLIENT_ID, status: 'en_cours', operator_id: OPERATOR_ID },
      error: null,
    })

    const result = await reactivateParcours({ clientId: CLIENT_ID })

    expect(result.error?.code).toBe('PARCOURS_NOT_ABANDONED')
  })

  it('successfully reactivates abandoned parcours', async () => {
    const result = await reactivateParcours({ clientId: CLIENT_ID })

    expect(result.error).toBeNull()
  })

  it('sends notification to client on reactivation', async () => {
    const { createNotification } = await import('../../notifications/actions/create-notification')

    await reactivateParcours({ clientId: CLIENT_ID })

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientType: 'client',
        type: 'system',
      })
    )
  })
})

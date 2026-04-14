import { describe, it, expect, vi, beforeEach } from 'vitest'
import { requestParcoursAbandonment } from './request-abandonment'

// --- Mocks ---

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()
const mockUpdate = vi.fn()
const mockInsert = vi.fn()

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
let notificationsChain: ReturnType<typeof makeChain>
let parcoursStepsChain: ReturnType<typeof makeChain>

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === 'parcours') return parcoursChain
      if (table === 'activity_logs') return activityChain
      if (table === 'clients') return clientsChain
      if (table === 'operators') return operatorsChain
      if (table === 'notifications') return notificationsChain
      if (table === 'parcours_steps') return parcoursStepsChain
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
  notificationsChain = makeChain()
  parcoursStepsChain = makeChain()

  // parcours select — returns parcours in_progress
  parcoursChain.single.mockResolvedValue({
    data: { id: PARCOURS_ID, client_id: CLIENT_ID, status: 'en_cours', operator_id: OPERATOR_ID },
    error: null,
  })

  // parcours update
  parcoursChain.update.mockReturnValue(parcoursChain)
  // After update, .eq returns chain, .single returns success
  let parcoursCallCount = 0
  parcoursChain.eq.mockImplementation(() => {
    parcoursCallCount++
    return parcoursChain
  })

  // parcours_steps for progression count — returns array, not .single()
  parcoursStepsChain.select.mockReturnValue(parcoursStepsChain)
  parcoursStepsChain.eq.mockResolvedValue({
    data: [
      { id: 'step-1', status: 'completed' },
      { id: 'step-2', status: 'current' },
    ],
    error: null,
  })

  // clients select
  clientsChain.eq.mockReturnValue(clientsChain)
  clientsChain.single.mockResolvedValue({
    data: { id: CLIENT_ID, auth_user_id: USER_ID, name: 'Test Client', operator_id: OPERATOR_ID },
    error: null,
  })

  // operators select
  operatorsChain.eq.mockReturnValue(operatorsChain)
  operatorsChain.single.mockResolvedValue({
    data: { id: OPERATOR_ID, auth_user_id: 'op-auth-id' },
    error: null,
  })

  // activity_logs insert
  activityChain.insert.mockReturnValue({ data: null, error: null })

  // notifications insert
  notificationsChain.insert.mockReturnValue(notificationsChain)
  notificationsChain.select.mockReturnValue(notificationsChain)
  notificationsChain.single.mockResolvedValue({ data: { id: 'notif-1' }, error: null })
}

describe('requestParcoursAbandonment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no user' } })

    const result = await requestParcoursAbandonment({ clientId: CLIENT_ID })

    expect(result.error).not.toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for invalid clientId', async () => {
    const result = await requestParcoursAbandonment({ clientId: 'invalid-uuid' })

    expect(result.error).not.toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns NOT_FOUND when parcours does not exist', async () => {
    parcoursChain.single.mockResolvedValue({ data: null, error: { message: 'not found' } })

    const result = await requestParcoursAbandonment({ clientId: CLIENT_ID })

    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns PARCOURS_ALREADY_COMPLETED when status is termine', async () => {
    parcoursChain.single.mockResolvedValue({
      data: { id: PARCOURS_ID, client_id: CLIENT_ID, status: 'termine', operator_id: OPERATOR_ID },
      error: null,
    })

    const result = await requestParcoursAbandonment({ clientId: CLIENT_ID })

    expect(result.error?.code).toBe('PARCOURS_ALREADY_COMPLETED')
  })

  it('returns PARCOURS_ALREADY_COMPLETED when status is abandoned', async () => {
    parcoursChain.single.mockResolvedValue({
      data: { id: PARCOURS_ID, client_id: CLIENT_ID, status: 'abandoned', operator_id: OPERATOR_ID },
      error: null,
    })

    const result = await requestParcoursAbandonment({ clientId: CLIENT_ID })

    expect(result.error?.code).toBe('PARCOURS_ALREADY_COMPLETED')
  })

  it('successfully abandons parcours with status en_cours', async () => {
    // For update success
    const updateChain = makeChain()
    let selectCount = 0
    parcoursChain.select.mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return parcoursChain // first select('*') for fetch
      return updateChain // second select after update
    })
    parcoursChain.update.mockReturnValue(parcoursChain)

    const result = await requestParcoursAbandonment({
      clientId: CLIENT_ID,
      reason: "Je n'ai plus le temps en ce moment",
    })

    expect(result.error).toBeNull()
  })

  it('successfully abandons parcours without reason', async () => {
    const result = await requestParcoursAbandonment({ clientId: CLIENT_ID })

    expect(result.error).toBeNull()
  })

  it('returns VALIDATION_ERROR for reason exceeding 1000 chars', async () => {
    const result = await requestParcoursAbandonment({
      clientId: CLIENT_ID,
      reason: 'x'.repeat(1001),
    })

    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('sends notification with progression in body', async () => {
    const { createNotification } = await import('../../notifications/actions/create-notification')

    await requestParcoursAbandonment({ clientId: CLIENT_ID, reason: 'Plus le temps' })

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientType: 'operator',
        type: 'alert',
        body: expect.stringContaining('1/2 étapes'),
      })
    )
  })
})

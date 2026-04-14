import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActionResponse } from '@monprojetpro/types'
import type { MeetingRequest } from '../types/meeting-request.types'

const mockGetUser = vi.fn()

const mockOrder = vi.fn()
const mockEq = vi.fn(() => ({ order: mockOrder }))
const mockSelect = vi.fn(() => ({ eq: mockEq, order: mockOrder }))

const mockFrom = vi.fn(() => ({ select: mockSelect }))

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

const CLIENT_ID = '00000000-0000-0000-0000-000000000001'
const OPERATOR_ID = '00000000-0000-0000-0000-000000000002'

const mockRequestsDB = [
  {
    id: '00000000-0000-0000-0000-000000000010',
    client_id: CLIENT_ID,
    operator_id: OPERATOR_ID,
    requested_slots: ['2026-03-01T10:00:00Z'],
    selected_slot: null,
    status: 'pending',
    message: null,
    meeting_id: null,
    created_at: '2026-02-20T10:00:00.000Z',
    updated_at: '2026-02-20T10:00:00.000Z',
  },
]

describe('getMeetingRequests Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: OPERATOR_ID } }, error: null })
    mockOrder.mockResolvedValue({ data: mockRequestsDB, error: null })
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } })

    const { getMeetingRequests } = await import('./get-meeting-requests')
    const result: ActionResponse<MeetingRequest[]> = await getMeetingRequests({})

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns meeting requests as camelCase data', async () => {
    const { getMeetingRequests } = await import('./get-meeting-requests')
    const result = await getMeetingRequests({})

    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(1)
    expect(result.data?.[0]?.clientId).toBe(CLIENT_ID)
    expect(result.data?.[0]?.status).toBe('pending')
  })

  it('returns VALIDATION_ERROR for invalid status', async () => {
    const { getMeetingRequests } = await import('./get-meeting-requests')
    const result = await getMeetingRequests({ status: 'invalid' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns DB_ERROR on query failure', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { getMeetingRequests } = await import('./get-meeting-requests')
    const result = await getMeetingRequests({})

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })
})

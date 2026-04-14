import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActionResponse } from '@monprojetpro/types'
import type { MeetingRequest } from '../types/meeting-request.types'

const mockGetUser = vi.fn()
const mockInsertSingle = vi.fn()
const mockInsertSelect = vi.fn(() => ({ single: mockInsertSingle }))
const mockInsert = vi.fn(() => ({ select: mockInsertSelect }))

const mockClientSingle = vi.fn()
const mockClientEq = vi.fn(() => ({ single: mockClientSingle }))
const mockClientSelect = vi.fn(() => ({ eq: mockClientEq }))

const mockFrom = vi.fn((table: string) => {
  if (table === 'notifications') return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) }
  if (table === 'clients') return { select: mockClientSelect }
  return { insert: mockInsert }
})

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

const CLIENT_ID = '00000000-0000-0000-0000-000000000001'
const OPERATOR_ID = '00000000-0000-0000-0000-000000000002'
const REQUEST_ID = '00000000-0000-0000-0000-000000000010'

const mockRequestDB = {
  id: REQUEST_ID,
  client_id: CLIENT_ID,
  operator_id: OPERATOR_ID,
  requested_slots: ['2026-03-01T10:00:00Z', '2026-03-01T14:00:00Z'],
  selected_slot: null,
  status: 'pending',
  message: null,
  meeting_id: null,
  created_at: '2026-02-20T10:00:00.000Z',
  updated_at: '2026-02-20T10:00:00.000Z',
}

describe('requestMeeting Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null })
    mockClientSingle.mockResolvedValue({ data: { id: CLIENT_ID }, error: null })
    mockInsertSingle.mockResolvedValue({ data: mockRequestDB, error: null })
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } })

    const { requestMeeting } = await import('./request-meeting')
    const result: ActionResponse<MeetingRequest> = await requestMeeting({
      operatorId: OPERATOR_ID,
      requestedSlots: ['2026-03-01T10:00:00Z'],
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for invalid operatorId', async () => {
    const { requestMeeting } = await import('./request-meeting')
    const result = await requestMeeting({
      operatorId: 'not-a-uuid',
      requestedSlots: ['2026-03-01T10:00:00Z'],
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns VALIDATION_ERROR for empty requestedSlots', async () => {
    const { requestMeeting } = await import('./request-meeting')
    const result = await requestMeeting({
      operatorId: OPERATOR_ID,
      requestedSlots: [],
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns NOT_FOUND when client record not found', async () => {
    mockClientSingle.mockResolvedValue({ data: null, error: null })

    const { requestMeeting } = await import('./request-meeting')
    const result = await requestMeeting({
      operatorId: OPERATOR_ID,
      requestedSlots: ['2026-03-01T10:00:00Z'],
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('creates meeting request and returns camelCase data', async () => {
    const { requestMeeting } = await import('./request-meeting')
    const result = await requestMeeting({
      operatorId: OPERATOR_ID,
      requestedSlots: ['2026-03-01T10:00:00Z', '2026-03-01T14:00:00Z'],
    })

    expect(result.error).toBeNull()
    expect(result.data?.id).toBe(REQUEST_ID)
    expect(result.data?.clientId).toBe(CLIENT_ID)
    expect(result.data?.status).toBe('pending')
    expect(result.data?.requestedSlots).toHaveLength(2)
  })

  it('returns DB_ERROR on insert failure', async () => {
    mockInsertSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { requestMeeting } = await import('./request-meeting')
    const result = await requestMeeting({
      operatorId: OPERATOR_ID,
      requestedSlots: ['2026-03-01T10:00:00Z'],
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })
})

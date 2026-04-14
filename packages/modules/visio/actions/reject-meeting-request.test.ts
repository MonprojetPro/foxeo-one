import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActionResponse } from '@monprojetpro/types'
import type { MeetingRequest } from '../types/meeting-request.types'

const mockGetUser = vi.fn()

const OPERATOR_ID = '00000000-0000-0000-0000-000000000002'
const CLIENT_ID = '00000000-0000-0000-0000-000000000001'
const REQUEST_ID = '00000000-0000-0000-0000-000000000010'

const mockPendingRequestDB = {
  id: REQUEST_ID,
  client_id: CLIENT_ID,
  operator_id: OPERATOR_ID,
  requested_slots: ['2026-03-01T10:00:00Z'],
  selected_slot: null,
  status: 'pending',
  message: null,
  meeting_id: null,
  created_at: '2026-02-20T10:00:00.000Z',
  updated_at: '2026-02-20T10:00:00.000Z',
}

const mockRejectedRequestDB = {
  ...mockPendingRequestDB,
  status: 'rejected',
  message: 'Pas disponible',
}

const mockRequestSelectSingle = vi.fn()
const mockRequestSelectEq = vi.fn(() => ({ single: mockRequestSelectSingle }))
const mockRequestSelect = vi.fn(() => ({ eq: mockRequestSelectEq }))

const mockUpdateSingle = vi.fn()
const mockUpdateSelect = vi.fn(() => ({ single: mockUpdateSingle }))
const mockUpdateEq = vi.fn(() => ({ select: mockUpdateSelect }))
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))

const mockClientSingle = vi.fn()
const mockClientEq = vi.fn(() => ({ single: mockClientSingle }))
const mockClientSelect = vi.fn(() => ({ eq: mockClientEq }))

let fromCallCount = 0

const mockFrom = vi.fn((table: string) => {
  if (table === 'notifications') return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) }
  if (table === 'clients') return { select: mockClientSelect }
  if (table === 'meeting_requests') {
    fromCallCount++
    if (fromCallCount % 2 === 1) return { select: mockRequestSelect }
    return { update: mockUpdate }
  }
  return { select: vi.fn() }
})

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

describe('rejectMeetingRequest Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fromCallCount = 0
    mockGetUser.mockResolvedValue({ data: { user: { id: OPERATOR_ID } }, error: null })
    mockRequestSelectSingle.mockResolvedValue({ data: mockPendingRequestDB, error: null })
    mockUpdateSingle.mockResolvedValue({ data: mockRejectedRequestDB, error: null })
    mockClientSingle.mockResolvedValue({ data: { auth_user_id: 'client-auth-id' }, error: null })
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } })

    const { rejectMeetingRequest } = await import('./reject-meeting-request')
    const result: ActionResponse<MeetingRequest> = await rejectMeetingRequest({
      requestId: REQUEST_ID,
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for invalid requestId', async () => {
    const { rejectMeetingRequest } = await import('./reject-meeting-request')
    const result = await rejectMeetingRequest({
      requestId: 'not-a-uuid',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns NOT_FOUND when request does not exist', async () => {
    mockRequestSelectSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

    const { rejectMeetingRequest } = await import('./reject-meeting-request')
    const result = await rejectMeetingRequest({
      requestId: REQUEST_ID,
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns CONFLICT when request is not pending', async () => {
    mockRequestSelectSingle.mockResolvedValue({
      data: { ...mockPendingRequestDB, status: 'accepted' },
      error: null,
    })

    const { rejectMeetingRequest } = await import('./reject-meeting-request')
    const result = await rejectMeetingRequest({
      requestId: REQUEST_ID,
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('CONFLICT')
  })

  it('rejects request and returns updated data', async () => {
    const { rejectMeetingRequest } = await import('./reject-meeting-request')
    const result = await rejectMeetingRequest({
      requestId: REQUEST_ID,
      reason: 'Pas disponible',
    })

    expect(result.error).toBeNull()
    expect(result.data?.status).toBe('rejected')
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActionResponse } from '@monprojetpro/types'
import type { MeetingRequest } from '../types/meeting-request.types'

const mockGetUser = vi.fn()

const OPERATOR_ID = '00000000-0000-0000-0000-000000000002'
const CLIENT_ID = '00000000-0000-0000-0000-000000000001'
const REQUEST_ID = '00000000-0000-0000-0000-000000000010'
const MEETING_ID = '00000000-0000-0000-0000-000000000020'

const mockPendingRequestDB = {
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

const mockAcceptedRequestDB = {
  ...mockPendingRequestDB,
  status: 'accepted',
  selected_slot: '2026-03-01T10:00:00Z',
  meeting_id: MEETING_ID,
}

const mockMeetingDB = {
  id: MEETING_ID,
  client_id: CLIENT_ID,
  operator_id: OPERATOR_ID,
  title: 'Consultation avec MiKL',
  scheduled_at: '2026-03-01T10:00:00Z',
  status: 'scheduled',
}

// Mock chain builders
const mockRequestSelectSingle = vi.fn()
const mockRequestSelectEq = vi.fn(() => ({ single: mockRequestSelectSingle }))
const mockRequestSelect = vi.fn(() => ({ eq: mockRequestSelectEq }))

const mockMeetingInsertSingle = vi.fn()
const mockMeetingInsertSelect = vi.fn(() => ({ single: mockMeetingInsertSingle }))
const mockMeetingInsert = vi.fn(() => ({ select: mockMeetingInsertSelect }))

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
  if (table === 'meetings') return { insert: mockMeetingInsert }
  if (table === 'meeting_requests') {
    fromCallCount++
    // First call: select (fetch request), second call: update
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

describe('acceptMeetingRequest Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fromCallCount = 0
    mockGetUser.mockResolvedValue({ data: { user: { id: OPERATOR_ID } }, error: null })
    mockRequestSelectSingle.mockResolvedValue({ data: mockPendingRequestDB, error: null })
    mockMeetingInsertSingle.mockResolvedValue({ data: mockMeetingDB, error: null })
    mockUpdateSingle.mockResolvedValue({ data: mockAcceptedRequestDB, error: null })
    mockClientSingle.mockResolvedValue({ data: { auth_user_id: 'client-auth-id' }, error: null })
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } })

    const { acceptMeetingRequest } = await import('./accept-meeting-request')
    const result: ActionResponse<MeetingRequest> = await acceptMeetingRequest({
      requestId: REQUEST_ID,
      selectedSlot: '2026-03-01T10:00:00Z',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for invalid requestId', async () => {
    const { acceptMeetingRequest } = await import('./accept-meeting-request')
    const result = await acceptMeetingRequest({
      requestId: 'not-a-uuid',
      selectedSlot: '2026-03-01T10:00:00Z',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns NOT_FOUND when request does not exist', async () => {
    mockRequestSelectSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

    const { acceptMeetingRequest } = await import('./accept-meeting-request')
    const result = await acceptMeetingRequest({
      requestId: REQUEST_ID,
      selectedSlot: '2026-03-01T10:00:00Z',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns CONFLICT when request is not pending', async () => {
    mockRequestSelectSingle.mockResolvedValue({
      data: { ...mockPendingRequestDB, status: 'accepted' },
      error: null,
    })

    const { acceptMeetingRequest } = await import('./accept-meeting-request')
    const result = await acceptMeetingRequest({
      requestId: REQUEST_ID,
      selectedSlot: '2026-03-01T10:00:00Z',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('CONFLICT')
  })

  it('returns VALIDATION_ERROR when selectedSlot is not in requestedSlots', async () => {
    mockRequestSelectSingle.mockResolvedValue({
      data: { ...mockPendingRequestDB, requested_slots: ['2026-03-02T09:00:00Z'] },
      error: null,
    })

    const { acceptMeetingRequest } = await import('./accept-meeting-request')
    const result = await acceptMeetingRequest({
      requestId: REQUEST_ID,
      selectedSlot: '2026-03-01T10:00:00Z',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('accepts request, creates meeting, and returns updated data', async () => {
    const { acceptMeetingRequest } = await import('./accept-meeting-request')
    const result = await acceptMeetingRequest({
      requestId: REQUEST_ID,
      selectedSlot: '2026-03-01T10:00:00Z',
    })

    expect(result.error).toBeNull()
    expect(result.data?.status).toBe('accepted')
    expect(result.data?.selectedSlot).toBe('2026-03-01T10:00:00Z')
    expect(result.data?.meetingId).toBe(MEETING_ID)
  })
})

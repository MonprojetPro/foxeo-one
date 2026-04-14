import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Meeting } from '../types/meeting.types'

const mockGetUser = vi.fn()

const mockUpdateSingle = vi.fn()
const mockUpdateSelect = vi.fn(() => ({ single: mockUpdateSingle }))
const mockUpdateEq = vi.fn(() => ({ select: mockUpdateSelect }))
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))

const mockSelectSingle = vi.fn()
const mockSelectEq = vi.fn(() => ({ single: mockSelectSingle }))
const mockSelect = vi.fn(() => ({ eq: mockSelectEq }))

const mockFrom = vi.fn(() => ({
  select: mockSelect,
  update: mockUpdate,
}))

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

const CLIENT_ID = '00000000-0000-0000-0000-000000000001'
const OPERATOR_ID = '00000000-0000-0000-0000-000000000002'
const MEETING_ID = '00000000-0000-0000-0000-000000000003'

const mockInProgressMeeting = {
  id: MEETING_ID,
  client_id: CLIENT_ID,
  operator_id: OPERATOR_ID,
  status: 'in_progress',
  type: 'standard',
  metadata: {},
  started_at: '2026-03-01T10:00:00.000Z',
  session_id: 'session-123',
}

const mockEndedMeetingDB = {
  id: MEETING_ID,
  client_id: CLIENT_ID,
  operator_id: OPERATOR_ID,
  title: 'Test Meeting',
  description: null,
  scheduled_at: null,
  started_at: '2026-03-01T10:00:00.000Z',
  ended_at: '2026-03-01T11:00:00.000Z',
  duration_seconds: 3600,
  session_id: 'session-123',
  status: 'completed',
  type: 'standard',
  metadata: {},
  recording_url: null,
  transcript_url: null,
  created_at: '2026-03-01T09:00:00.000Z',
  updated_at: '2026-03-01T11:00:00.000Z',
}

describe('endMeeting Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: OPERATOR_ID } }, error: null })
    mockSelectSingle.mockResolvedValue({ data: mockInProgressMeeting, error: null })
    mockUpdateSingle.mockResolvedValue({ data: mockEndedMeetingDB, error: null })
  })

  it('returns UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } })

    const { endMeeting } = await import('./end-meeting')
    const result = await endMeeting({ meetingId: MEETING_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for non-UUID meetingId', async () => {
    const { endMeeting } = await import('./end-meeting')
    const result = await endMeeting({ meetingId: 'bad' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns NOT_FOUND when meeting does not exist', async () => {
    mockSelectSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })

    const { endMeeting } = await import('./end-meeting')
    const result = await endMeeting({ meetingId: MEETING_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns CONFLICT when meeting is not in_progress', async () => {
    mockSelectSingle.mockResolvedValue({ data: { ...mockInProgressMeeting, status: 'scheduled' }, error: null })

    const { endMeeting } = await import('./end-meeting')
    const result = await endMeeting({ meetingId: MEETING_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('CONFLICT')
  })

  it('ends meeting, calculates duration, returns completed meeting', async () => {
    const { endMeeting } = await import('./end-meeting')
    const result = await endMeeting({ meetingId: MEETING_ID })

    expect(result.error).toBeNull()
    expect(result.data?.status).toBe('completed')
    expect(result.data?.durationSeconds).toBe(3600)
    expect(result.data?.endedAt).toBe('2026-03-01T11:00:00.000Z')
    expect(result.data?.type).toBe('standard')
  })

  it('returns meeting with prospect type so caller can trigger post-meeting dialog', async () => {
    mockSelectSingle.mockResolvedValue({
      data: { ...mockInProgressMeeting, type: 'prospect' },
      error: null,
    })
    mockUpdateSingle.mockResolvedValue({
      data: { ...mockEndedMeetingDB, type: 'prospect' },
      error: null,
    })

    const { endMeeting } = await import('./end-meeting')
    const result = await endMeeting({ meetingId: MEETING_ID })

    expect(result.error).toBeNull()
    expect(result.data?.type).toBe('prospect')
  })
})

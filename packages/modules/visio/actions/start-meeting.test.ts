import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActionResponse } from '@monprojetpro/types'
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

const mockMeetingDB = {
  id: MEETING_ID,
  client_id: CLIENT_ID,
  operator_id: OPERATOR_ID,
  title: 'Test Meeting',
  description: null,
  scheduled_at: null,
  started_at: '2026-03-01T10:00:00.000Z',
  ended_at: null,
  duration_seconds: null,
  meet_space_name: 'spaces/abc123',
  meet_uri: 'https://meet.google.com/abc-def-ghi',
  status: 'in_progress',
  type: 'standard',
  metadata: {},
  recording_url: null,
  transcript_url: null,
  created_at: '2026-03-01T09:00:00.000Z',
  updated_at: '2026-03-01T10:00:00.000Z',
}

describe('startMeeting Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: OPERATOR_ID } }, error: null })
    mockSelectSingle.mockResolvedValue({ data: { id: MEETING_ID, status: 'scheduled' }, error: null })
    mockUpdateSingle.mockResolvedValue({ data: mockMeetingDB, error: null })
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } })

    const { startMeeting } = await import('./start-meeting')
    const result: ActionResponse<Meeting> = await startMeeting({ meetingId: MEETING_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for non-UUID meetingId', async () => {
    const { startMeeting } = await import('./start-meeting')
    const result = await startMeeting({ meetingId: 'not-a-uuid' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns NOT_FOUND when meeting does not exist', async () => {
    mockSelectSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })

    const { startMeeting } = await import('./start-meeting')
    const result = await startMeeting({ meetingId: MEETING_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns CONFLICT when meeting is already in_progress', async () => {
    mockSelectSingle.mockResolvedValue({ data: { id: MEETING_ID, status: 'in_progress' }, error: null })

    const { startMeeting } = await import('./start-meeting')
    const result = await startMeeting({ meetingId: MEETING_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('CONFLICT')
  })

  it('starts meeting and returns updated data with Google Meet link', async () => {
    const { startMeeting } = await import('./start-meeting')
    const result = await startMeeting({ meetingId: MEETING_ID })

    expect(result.error).toBeNull()
    expect(result.data?.status).toBe('in_progress')
    expect(result.data?.meetSpaceName).toBe('spaces/abc123')
    expect(result.data?.meetUri).toBe('https://meet.google.com/abc-def-ghi')
  })
})

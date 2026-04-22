import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActionResponse } from '@monprojetpro/types'
import type { Meeting } from '../types/meeting.types'

const mockGetUser = vi.fn()

const mockNotifySingle = vi.fn()
const mockNotifyEq = vi.fn(() => ({ single: mockNotifySingle }))
const mockNotifySelect = vi.fn(() => ({ eq: mockNotifyEq }))
const mockNotifyFrom = vi.fn(() => ({ select: mockNotifySelect }))

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
const MEETING_ID = '00000000-0000-0000-0000-000000000003'

const mockMeetingDB = {
  id: MEETING_ID,
  client_id: CLIENT_ID,
  operator_id: OPERATOR_ID,
  title: 'Test Meeting',
  description: null,
  scheduled_at: null,
  started_at: null,
  ended_at: null,
  duration_seconds: null,
  meet_space_name: null,
  meet_uri: null,
  status: 'scheduled',
  type: 'standard',
  metadata: {},
  recording_url: null,
  transcript_url: null,
  created_at: '2026-03-01T10:00:00.000Z',
  updated_at: '2026-03-01T10:00:00.000Z',
}

describe('createMeeting Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null })
    mockInsertSingle.mockResolvedValue({ data: mockMeetingDB, error: null })
    mockClientSingle.mockResolvedValue({ data: { auth_user_id: 'client-auth-user-id' }, error: null })
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } })

    const { createMeeting } = await import('./create-meeting')
    const result: ActionResponse<Meeting> = await createMeeting({
      clientId: CLIENT_ID,
      operatorId: OPERATOR_ID,
      title: 'Test',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for invalid input', async () => {
    const { createMeeting } = await import('./create-meeting')
    const result = await createMeeting({
      clientId: 'not-a-uuid',
      operatorId: OPERATOR_ID,
      title: 'Test',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns VALIDATION_ERROR for empty title', async () => {
    const { createMeeting } = await import('./create-meeting')
    const result = await createMeeting({
      clientId: CLIENT_ID,
      operatorId: OPERATOR_ID,
      title: '',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('creates meeting and returns camelCase data', async () => {
    const { createMeeting } = await import('./create-meeting')
    const result = await createMeeting({
      clientId: CLIENT_ID,
      operatorId: OPERATOR_ID,
      title: 'Test Meeting',
    })

    expect(result.error).toBeNull()
    expect(result.data?.id).toBe(MEETING_ID)
    expect(result.data?.clientId).toBe(CLIENT_ID)
    expect(result.data?.operatorId).toBe(OPERATOR_ID)
    expect(result.data?.title).toBe('Test Meeting')
    expect(result.data?.status).toBe('scheduled')
  })

  it('creates meeting without clientId (Hub-originated)', async () => {
    mockInsertSingle.mockResolvedValue({
      data: { ...mockMeetingDB, client_id: null, clientId: null },
      error: null,
    })

    const { createMeeting } = await import('./create-meeting')
    const result = await createMeeting({
      operatorId: OPERATOR_ID,
      title: 'Hub Meeting sans client',
    })

    expect(result.error).toBeNull()
    expect(result.data?.title).toBe('Test Meeting') // from mockMeetingDB
  })

  it('returns DB_ERROR on insert failure', async () => {
    mockInsertSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { createMeeting } = await import('./create-meeting')
    const result = await createMeeting({
      clientId: CLIENT_ID,
      operatorId: OPERATOR_ID,
      title: 'Test Meeting',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })
})

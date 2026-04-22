import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActionResponse } from '@monprojetpro/types'
import type { Meeting } from '../types/meeting.types'

const mockGetUser = vi.fn()

const mockSingle = vi.fn()
const mockEq = vi.fn(() => ({ single: mockSingle }))
const mockOrder = vi.fn()
const mockEqStatus = vi.fn(() => ({ order: mockOrder }))
const mockEqClient = vi.fn(() => ({ eq: mockEqStatus, order: mockOrder }))
const mockSelect = vi.fn(() => ({ eq: mockEqClient, order: mockOrder }))

const mockFrom = vi.fn(() => ({ select: mockSelect }))

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

describe('getMeetings Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null })
    mockOrder.mockResolvedValue({ data: [mockMeetingDB], error: null })
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } })

    const { getMeetings } = await import('./get-meetings')
    const result: ActionResponse<Meeting[]> = await getMeetings({})

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns meetings list on success', async () => {
    const { getMeetings } = await import('./get-meetings')
    const result = await getMeetings({})

    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()
    expect(Array.isArray(result.data)).toBe(true)
  })

  it('returns meetings mapped to camelCase', async () => {
    const { getMeetings } = await import('./get-meetings')
    const result = await getMeetings({})

    expect(result.data?.[0]?.clientId).toBe(CLIENT_ID)
    expect(result.data?.[0]?.operatorId).toBe(OPERATOR_ID)
    expect(result.data?.[0]?.title).toBe('Test Meeting')
    expect(result.data?.[0]?.status).toBe('scheduled')
  })

  it('returns DB_ERROR on query failure', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { getMeetings } = await import('./get-meetings')
    const result = await getMeetings({})

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockSingle = vi.fn()
const mockLimit = vi.fn(() => ({ single: mockSingle }))
const mockOrder = vi.fn(() => ({ limit: mockLimit }))
const mockSelectEq = vi.fn(() => ({ single: mockSingle, order: mockOrder }))
const mockSelect = vi.fn(() => ({ eq: mockSelectEq }))

const mockUpdateEq = vi.fn()
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))
const mockInsert = vi.fn()

const mockFrom = vi.fn((table: string) => {
  if (table === 'meetings') {
    return { select: mockSelect }
  }
  return {
    select: mockSelect,
    update: mockUpdate,
    insert: mockInsert,
  }
})

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

const MEETING_ID = '00000000-0000-0000-0000-000000000001'
const RECORDING_ID = '00000000-0000-0000-0000-000000000099'

const mockMeeting = {
  meet_space_name: 'spaces/abc123def456',
}

const DRIVE_URL = 'https://docs.google.com/file/d/rec123/view'
const DOCS_URL = 'https://docs.google.com/document/d/trans456/view'

const mockFetchToken = {
  ok: true,
  json: async () => ({ access_token: 'mock-access-token' }),
}

const mockConferenceList = {
  ok: true,
  json: async () => ({
    conferenceRecords: [{ name: 'conferenceRecords/conf-xyz' }],
  }),
}

const mockRecordingsList = {
  ok: true,
  json: async () => ({
    recordings: [{ driveDestination: { exportUri: DRIVE_URL } }],
  }),
}

const mockTranscriptsList = {
  ok: true,
  json: async () => ({
    transcripts: [
      {
        docsDestination: { exportUri: DOCS_URL },
        state: 'FILE_GENERATED',
      },
    ],
  }),
}

function setupFetchMock(responses: unknown[]) {
  let callCount = 0
  vi.stubGlobal('fetch', vi.fn(() => {
    const res = responses[callCount] ?? responses[responses.length - 1]
    callCount++
    return Promise.resolve(res)
  }))
}

describe('syncMeetingResults Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
    process.env.GOOGLE_MEET_REFRESH_TOKEN = 'mock-refresh-token'
    process.env.GOOGLE_CLIENT_ID = 'mock-client-id'
    process.env.GOOGLE_CLIENT_SECRET = 'mock-client-secret'

    mockGetUser.mockResolvedValue({ data: { user: { id: 'op-1' } }, error: null })
  })

  it('returns VALIDATION_ERROR for non-UUID meetingId', async () => {
    const { syncMeetingResults } = await import('./sync-meeting-results')
    const result = await syncMeetingResults({ meetingId: 'not-a-uuid' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns NOT_FOUND when meeting has no meet_space_name', async () => {
    mockSelectEq.mockReturnValueOnce({
      single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    })

    const { syncMeetingResults } = await import('./sync-meeting-results')
    const result = await syncMeetingResults({ meetingId: MEETING_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns CONFIG_ERROR when Google credentials are missing', async () => {
    delete process.env.GOOGLE_MEET_REFRESH_TOKEN

    mockSelectEq.mockReturnValueOnce({
      single: vi.fn().mockResolvedValue({ data: mockMeeting, error: null }),
    })

    const { syncMeetingResults } = await import('./sync-meeting-results')
    const result = await syncMeetingResults({ meetingId: MEETING_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('CONFIG_ERROR')
  })

  it('returns AUTH_ERROR when token refresh fails', async () => {
    mockSelectEq.mockReturnValueOnce({
      single: vi.fn().mockResolvedValue({ data: mockMeeting, error: null }),
    })

    setupFetchMock([{ ok: false, status: 401 }])

    const { syncMeetingResults } = await import('./sync-meeting-results')
    const result = await syncMeetingResults({ meetingId: MEETING_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('AUTH_ERROR')
  })

  it('returns synced:false when no conference record found', async () => {
    mockSelectEq.mockReturnValueOnce({
      single: vi.fn().mockResolvedValue({ data: mockMeeting, error: null }),
    })

    setupFetchMock([
      mockFetchToken,
      { ok: true, json: async () => ({ conferenceRecords: [] }) },
    ])

    const { syncMeetingResults } = await import('./sync-meeting-results')
    const result = await syncMeetingResults({ meetingId: MEETING_ID })

    expect(result.error).toBeNull()
    expect(result.data?.synced).toBe(false)
  })

  it('returns synced:false when no recording or transcript url', async () => {
    mockSelectEq.mockReturnValueOnce({
      single: vi.fn().mockResolvedValue({ data: mockMeeting, error: null }),
    })

    setupFetchMock([
      mockFetchToken,
      mockConferenceList,
      { ok: true, json: async () => ({ recordings: [] }) },
      { ok: true, json: async () => ({ transcripts: [] }) },
    ])

    const { syncMeetingResults } = await import('./sync-meeting-results')
    const result = await syncMeetingResults({ meetingId: MEETING_ID })

    expect(result.error).toBeNull()
    expect(result.data?.synced).toBe(false)
  })

  it('inserts new recording row when none exists', async () => {
    mockSelectEq.mockReturnValueOnce({
      single: vi.fn().mockResolvedValue({ data: mockMeeting, error: null }),
    })
    // Second from('meeting_recordings').select().eq().order().limit().single() → no existing
    const mockSingleNoRecord = vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
    mockLimit.mockReturnValueOnce({ single: mockSingleNoRecord })
    mockInsert.mockResolvedValue({ error: null })

    setupFetchMock([
      mockFetchToken,
      mockConferenceList,
      mockRecordingsList,
      mockTranscriptsList,
    ])

    const { syncMeetingResults } = await import('./sync-meeting-results')
    const result = await syncMeetingResults({ meetingId: MEETING_ID })

    expect(result.error).toBeNull()
    expect(result.data?.synced).toBe(true)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        meeting_id: MEETING_ID,
        recording_url: DRIVE_URL,
        transcript_url: DOCS_URL,
        transcription_status: 'completed',
      })
    )
  })

  it('updates existing recording row when one exists', async () => {
    mockSelectEq.mockReturnValueOnce({
      single: vi.fn().mockResolvedValue({ data: mockMeeting, error: null }),
    })
    const mockSingleExisting = vi.fn().mockResolvedValue({
      data: { id: RECORDING_ID, recording_url: DRIVE_URL },
      error: null,
    })
    mockLimit.mockReturnValueOnce({ single: mockSingleExisting })
    mockUpdateEq.mockResolvedValue({ error: null })

    setupFetchMock([
      mockFetchToken,
      mockConferenceList,
      mockRecordingsList,
      mockTranscriptsList,
    ])

    const { syncMeetingResults } = await import('./sync-meeting-results')
    const result = await syncMeetingResults({ meetingId: MEETING_ID })

    expect(result.error).toBeNull()
    expect(result.data?.synced).toBe(true)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        recording_url: DRIVE_URL,
        transcript_url: DOCS_URL,
        transcription_status: 'completed',
      })
    )
    expect(mockUpdateEq).toHaveBeenCalledWith('id', RECORDING_ID)
  })

  it('returns DB_ERROR when insert fails', async () => {
    mockSelectEq.mockReturnValueOnce({
      single: vi.fn().mockResolvedValue({ data: mockMeeting, error: null }),
    })
    const mockSingleNoRecord = vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
    mockLimit.mockReturnValueOnce({ single: mockSingleNoRecord })
    mockInsert.mockResolvedValue({ error: { message: 'duplicate key' } })

    setupFetchMock([
      mockFetchToken,
      mockConferenceList,
      mockRecordingsList,
      mockTranscriptsList,
    ])

    const { syncMeetingResults } = await import('./sync-meeting-results')
    const result = await syncMeetingResults({ meetingId: MEETING_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })

  it('returns DB_ERROR when update fails', async () => {
    mockSelectEq.mockReturnValueOnce({
      single: vi.fn().mockResolvedValue({ data: mockMeeting, error: null }),
    })
    const mockSingleExisting = vi.fn().mockResolvedValue({
      data: { id: RECORDING_ID, recording_url: DRIVE_URL },
      error: null,
    })
    mockLimit.mockReturnValueOnce({ single: mockSingleExisting })
    mockUpdateEq.mockResolvedValue({ error: { message: 'row locked' } })

    setupFetchMock([
      mockFetchToken,
      mockConferenceList,
      mockRecordingsList,
      mockTranscriptsList,
    ])

    const { syncMeetingResults } = await import('./sync-meeting-results')
    const result = await syncMeetingResults({ meetingId: MEETING_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })

  it('returns AUTH_ERROR when access_token absent in response (HTTP 200 with error body)', async () => {
    mockSelectEq.mockReturnValueOnce({
      single: vi.fn().mockResolvedValue({ data: mockMeeting, error: null }),
    })

    setupFetchMock([
      { ok: true, json: async () => ({ error: 'invalid_grant' }) },
    ])

    const { syncMeetingResults } = await import('./sync-meeting-results')
    const result = await syncMeetingResults({ meetingId: MEETING_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('AUTH_ERROR')
  })

  it('maps FAILED transcript state to failed status', async () => {
    mockSelectEq.mockReturnValueOnce({
      single: vi.fn().mockResolvedValue({ data: mockMeeting, error: null }),
    })
    const mockSingleInsert = vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
    mockLimit.mockReturnValueOnce({ single: mockSingleInsert })
    mockInsert.mockResolvedValue({ error: null })

    setupFetchMock([
      mockFetchToken,
      mockConferenceList,
      mockRecordingsList,
      {
        ok: true,
        json: async () => ({
          transcripts: [
            {
              docsDestination: { exportUri: DOCS_URL },
              state: 'FAILED',
            },
          ],
        }),
      },
    ])

    const { syncMeetingResults } = await import('./sync-meeting-results')
    await syncMeetingResults({ meetingId: MEETING_ID })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ transcription_status: 'failed' })
    )
  })

  it('maps STARTED transcript state to processing', async () => {
    mockSelectEq.mockReturnValueOnce({
      single: vi.fn().mockResolvedValue({ data: mockMeeting, error: null }),
    })
    const mockSingleInsert = vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
    mockLimit.mockReturnValueOnce({ single: mockSingleInsert })
    mockInsert.mockResolvedValue({ error: null })

    setupFetchMock([
      mockFetchToken,
      mockConferenceList,
      mockRecordingsList,
      {
        ok: true,
        json: async () => ({
          transcripts: [
            {
              docsDestination: { exportUri: DOCS_URL },
              state: 'STARTED',
            },
          ],
        }),
      },
    ])

    const { syncMeetingResults } = await import('./sync-meeting-results')
    await syncMeetingResults({ meetingId: MEETING_ID })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ transcription_status: 'processing' })
    )
  })
})

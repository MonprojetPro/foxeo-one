import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActionResponse } from '@monprojetpro/types'
import type { MeetingRecording } from '../types/recording.types'

const mockGetUser = vi.fn()

const mockOrder = vi.fn()
const mockEq = vi.fn(() => ({ order: mockOrder }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

const MEETING_ID = '00000000-0000-0000-0000-000000000001'
const RECORDING_ID = '00000000-0000-0000-0000-000000000002'

const mockRecordingDB = {
  id: RECORDING_ID,
  meeting_id: MEETING_ID,
  recording_url: 'session-abc/rec-123.mp4',
  recording_duration_seconds: 3600,
  file_size_bytes: 104857600,
  transcript_url: null,
  transcription_status: 'pending',
  transcription_language: 'fr',
  created_at: '2026-03-01T10:00:00.000Z',
  updated_at: '2026-03-01T10:00:00.000Z',
}

describe('getMeetingRecordings Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null })
    mockOrder.mockResolvedValue({ data: [mockRecordingDB], error: null })
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } })

    const { getMeetingRecordings } = await import('./get-meeting-recordings')
    const result: ActionResponse<MeetingRecording[]> = await getMeetingRecordings({ meetingId: MEETING_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for invalid meetingId', async () => {
    const { getMeetingRecordings } = await import('./get-meeting-recordings')
    const result = await getMeetingRecordings({ meetingId: 'not-a-uuid' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns recordings list on success', async () => {
    const { getMeetingRecordings } = await import('./get-meeting-recordings')
    const result = await getMeetingRecordings({ meetingId: MEETING_ID })

    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()
    expect(Array.isArray(result.data)).toBe(true)
  })

  it('returns recordings mapped to camelCase', async () => {
    const { getMeetingRecordings } = await import('./get-meeting-recordings')
    const result = await getMeetingRecordings({ meetingId: MEETING_ID })

    expect(result.data?.[0]?.meetingId).toBe(MEETING_ID)
    expect(result.data?.[0]?.recordingUrl).toBe('session-abc/rec-123.mp4')
    expect(result.data?.[0]?.recordingDurationSeconds).toBe(3600)
    expect(result.data?.[0]?.fileSizeBytes).toBe(104857600)
    expect(result.data?.[0]?.transcriptionStatus).toBe('pending')
  })

  it('returns DB_ERROR on query failure', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { getMeetingRecordings } = await import('./get-meeting-recordings')
    const result = await getMeetingRecordings({ meetingId: MEETING_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })
})

import { describe, it, expect } from 'vitest'
import { toMeeting } from './to-meeting'
import type { MeetingDB } from '../types/meeting.types'

const CLIENT_ID = '00000000-0000-0000-0000-000000000001'
const OPERATOR_ID = '00000000-0000-0000-0000-000000000002'
const MEETING_ID = '00000000-0000-0000-0000-000000000003'

const mockDB: MeetingDB = {
  id: MEETING_ID,
  client_id: CLIENT_ID,
  operator_id: OPERATOR_ID,
  title: 'Test Meeting',
  description: 'Description',
  scheduled_at: '2026-03-01T10:00:00.000Z',
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
  created_at: '2026-03-01T09:00:00.000Z',
  updated_at: '2026-03-01T09:00:00.000Z',
}

describe('toMeeting', () => {
  it('maps snake_case DB fields to camelCase domain fields', () => {
    const meeting = toMeeting(mockDB)
    expect(meeting.id).toBe(MEETING_ID)
    expect(meeting.clientId).toBe(CLIENT_ID)
    expect(meeting.operatorId).toBe(OPERATOR_ID)
    expect(meeting.title).toBe('Test Meeting')
    expect(meeting.description).toBe('Description')
    expect(meeting.scheduledAt).toBe('2026-03-01T10:00:00.000Z')
    expect(meeting.startedAt).toBeNull()
    expect(meeting.endedAt).toBeNull()
    expect(meeting.durationSeconds).toBeNull()
    expect(meeting.meetSpaceName).toBeNull()
    expect(meeting.meetUri).toBeNull()
    expect(meeting.status).toBe('scheduled')
    expect(meeting.type).toBe('standard')
    expect(meeting.metadata).toEqual({})
    expect(meeting.recordingUrl).toBeNull()
    expect(meeting.transcriptUrl).toBeNull()
    expect(meeting.createdAt).toBe('2026-03-01T09:00:00.000Z')
    expect(meeting.updatedAt).toBe('2026-03-01T09:00:00.000Z')
  })

  it('maps completed meeting with all fields', () => {
    const completedDB: MeetingDB = {
      ...mockDB,
      status: 'completed',
      started_at: '2026-03-01T10:00:00.000Z',
      ended_at: '2026-03-01T11:00:00.000Z',
      duration_seconds: 3600,
      meet_space_name: 'spaces/abc123',
      meet_uri: 'https://meet.google.com/abc-def-ghi',
      recording_url: 'https://storage/recording.mp4',
      transcript_url: 'https://storage/transcript.txt',
    }
    const meeting = toMeeting(completedDB)
    expect(meeting.status).toBe('completed')
    expect(meeting.startedAt).toBe('2026-03-01T10:00:00.000Z')
    expect(meeting.endedAt).toBe('2026-03-01T11:00:00.000Z')
    expect(meeting.durationSeconds).toBe(3600)
    expect(meeting.meetSpaceName).toBe('spaces/abc123')
    expect(meeting.meetUri).toBe('https://meet.google.com/abc-def-ghi')
    expect(meeting.recordingUrl).toBe('https://storage/recording.mp4')
    expect(meeting.transcriptUrl).toBe('https://storage/transcript.txt')
  })

  it('maps prospect meeting with metadata', () => {
    const prospectDB: MeetingDB = {
      ...mockDB,
      type: 'prospect',
      metadata: { prospect_converted: true, client_id: 'some-uuid' },
    }
    const meeting = toMeeting(prospectDB)
    expect(meeting.type).toBe('prospect')
    expect(meeting.metadata).toEqual({ prospect_converted: true, client_id: 'some-uuid' })
  })

  it('defaults type to standard when missing', () => {
    const dbWithoutType = { ...mockDB } as Partial<MeetingDB>
    delete (dbWithoutType as Record<string, unknown>).type
    const meeting = toMeeting(dbWithoutType as MeetingDB)
    expect(meeting.type).toBe('standard')
  })
})

import { z } from 'zod'

// ============================================================
// Domain types (camelCase — post-boundary transformation)
// ============================================================

export const MeetingStatusValues = ['scheduled', 'in_progress', 'completed', 'cancelled'] as const
export type MeetingStatus = typeof MeetingStatusValues[number]

export const MeetingTypeValues = ['standard', 'prospect', 'onboarding', 'support'] as const
export type MeetingType = typeof MeetingTypeValues[number]

export interface Meeting {
  id: string
  clientId: string | null
  operatorId: string
  title: string
  description: string | null
  scheduledAt: string | null
  startedAt: string | null
  endedAt: string | null
  durationSeconds: number | null
  meetSpaceName: string | null
  meetUri: string | null
  status: MeetingStatus
  type: MeetingType
  metadata: Record<string, unknown>
  recordingUrl: string | null
  transcriptUrl: string | null
  createdAt: string
  updatedAt: string
}

// ============================================================
// DB types (snake_case — raw Supabase rows)
// ============================================================

export interface MeetingDB {
  id: string
  client_id: string | null
  operator_id: string
  title: string
  description: string | null
  scheduled_at: string | null
  started_at: string | null
  ended_at: string | null
  duration_seconds: number | null
  meet_space_name: string | null
  meet_uri: string | null
  status: MeetingStatus
  type: MeetingType
  metadata: Record<string, unknown>
  recording_url: string | null
  transcript_url: string | null
  created_at: string
  updated_at: string
}

// ============================================================
// Action input types & Zod schemas
// ============================================================

export const CreateMeetingInput = z.object({
  clientId: z.string().uuid('clientId invalide').optional(),
  operatorId: z.string().uuid('operatorId invalide'),
  title: z.string().min(1, 'Le titre est requis'),
  description: z.string().optional(),
  scheduledAt: z.string().datetime({ offset: true }).optional(),
  meetSpaceName: z.string().optional(),
  meetUri: z.string().url().optional(),
})
export type CreateMeetingInput = z.infer<typeof CreateMeetingInput>

export const StartMeetingInput = z.object({
  meetingId: z.string().uuid('meetingId invalide'),
})
export type StartMeetingInput = z.infer<typeof StartMeetingInput>

export const EndMeetingInput = z.object({
  meetingId: z.string().uuid('meetingId invalide'),
})
export type EndMeetingInput = z.infer<typeof EndMeetingInput>

export const GetMeetingsInput = z.object({
  clientId: z.string().uuid('clientId invalide').optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
})
export type GetMeetingsInput = z.infer<typeof GetMeetingsInput>

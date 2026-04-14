import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

const OPERATOR_ID = '00000000-0000-0000-0000-000000000001'
const CLIENT_ID = '00000000-0000-0000-0000-000000000002'
const MEETING_ID = '00000000-0000-0000-0000-000000000003'
const REMINDER_ID = '00000000-0000-0000-0000-000000000004'

const validInput = {
  meetingId: MEETING_ID,
  dueDate: new Date(Date.now() + 86400000).toISOString(),
  message: 'Relancer le prospect',
}

describe('scheduleFollowUp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: OPERATOR_ID } }, error: null })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'operators') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: OPERATOR_ID }, error: null }) })) })) }
      }
      if (table === 'meetings') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { client_id: CLIENT_ID }, error: null }) })) })) }
      }
      if (table === 'reminders') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: REMINDER_ID }, error: null }) })),
          })),
        }
      }
      return {}
    })
  })

  it('returns UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } })
    const { scheduleFollowUp } = await import('./schedule-follow-up')
    const result = await scheduleFollowUp(validInput)
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for invalid meetingId', async () => {
    const { scheduleFollowUp } = await import('./schedule-follow-up')
    const result = await scheduleFollowUp({ ...validInput, meetingId: 'not-a-uuid' })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns VALIDATION_ERROR for empty message', async () => {
    const { scheduleFollowUp } = await import('./schedule-follow-up')
    const result = await scheduleFollowUp({ ...validInput, message: '' })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns NOT_FOUND when operator not found', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'operators') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }) })) })) }
      }
      return {}
    })
    const { scheduleFollowUp } = await import('./schedule-follow-up')
    const result = await scheduleFollowUp(validInput)
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns NOT_FOUND when meeting not found', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'operators') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: OPERATOR_ID }, error: null }) })) })) }
      }
      if (table === 'meetings') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }) })) })) }
      }
      return {}
    })
    const { scheduleFollowUp } = await import('./schedule-follow-up')
    const result = await scheduleFollowUp(validInput)
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns reminderId on success', async () => {
    const { scheduleFollowUp } = await import('./schedule-follow-up')
    const result = await scheduleFollowUp(validInput)
    expect(result.error).toBeNull()
    expect(result.data?.reminderId).toBe(REMINDER_ID)
  })
})

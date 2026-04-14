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
const MEETING_ID = '00000000-0000-0000-0000-000000000002'

const validInput = {
  meetingId: MEETING_ID,
}

describe('markProspectNotInterested', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: OPERATOR_ID } }, error: null })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'meetings') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { metadata: {} }, error: null }),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        }
      }
      return {}
    })
  })

  it('returns UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } })
    const { markProspectNotInterested } = await import('./mark-prospect-not-interested')
    const result = await markProspectNotInterested(validInput)
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for invalid meetingId', async () => {
    const { markProspectNotInterested } = await import('./mark-prospect-not-interested')
    const result = await markProspectNotInterested({ meetingId: 'not-a-uuid' })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns NOT_FOUND when meeting does not exist', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'meetings') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
            })),
          })),
        }
      }
      return {}
    })
    const { markProspectNotInterested } = await import('./mark-prospect-not-interested')
    const result = await markProspectNotInterested(validInput)
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns meetingId on success without reason', async () => {
    const { markProspectNotInterested } = await import('./mark-prospect-not-interested')
    const result = await markProspectNotInterested(validInput)
    expect(result.error).toBeNull()
    expect(result.data?.meetingId).toBe(MEETING_ID)
  })

  it('returns meetingId on success with reason', async () => {
    const { markProspectNotInterested } = await import('./mark-prospect-not-interested')
    const result = await markProspectNotInterested({ ...validInput, reason: 'budget' })
    expect(result.error).toBeNull()
    expect(result.data?.meetingId).toBe(MEETING_ID)
  })

  it('updates meeting status to completed and sets not_interested metadata', async () => {
    const mockUpdate = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }))
    const mockSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: { metadata: { existing_key: 'value' } }, error: null }),
      })),
    }))
    mockFrom.mockImplementation((table: string) => {
      if (table === 'meetings') {
        return { select: mockSelect, update: mockUpdate }
      }
      return {}
    })
    const { markProspectNotInterested } = await import('./mark-prospect-not-interested')
    await markProspectNotInterested({ meetingId: MEETING_ID, reason: 'timing' })

    expect(mockUpdate).toHaveBeenCalled()
    const updateCall = mockUpdate.mock.calls[0][0]
    expect(updateCall.status).toBe('completed')
    expect(updateCall.metadata.not_interested).toBe(true)
    expect(updateCall.metadata.not_interested_reason).toBe('timing')
    expect(updateCall.metadata.existing_key).toBe('value')
  })
})

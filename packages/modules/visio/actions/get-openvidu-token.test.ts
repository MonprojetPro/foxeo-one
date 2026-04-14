import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockInvoke = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    functions: { invoke: mockInvoke },
  })),
}))

const MEETING_ID = '00000000-0000-0000-0000-000000000003'

describe('getOpenViduToken Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null })
    mockInvoke.mockResolvedValue({
      data: { token: 'test-token-abc', sessionId: `session-${MEETING_ID}` },
      error: null,
    })
  })

  it('returns UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } })

    const { getOpenViduToken } = await import('./get-openvidu-token')
    const result = await getOpenViduToken({ meetingId: MEETING_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for non-UUID meetingId', async () => {
    const { getOpenViduToken } = await import('./get-openvidu-token')
    const result = await getOpenViduToken({ meetingId: 'not-a-uuid' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns token and sessionId on success', async () => {
    const { getOpenViduToken } = await import('./get-openvidu-token')
    const result = await getOpenViduToken({ meetingId: MEETING_ID })

    expect(result.error).toBeNull()
    expect(result.data?.token).toBe('test-token-abc')
    expect(result.data?.sessionId).toBe(`session-${MEETING_ID}`)
  })

  it('returns OPENVIDU_ERROR when edge function fails', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'Edge function error' } })

    const { getOpenViduToken } = await import('./get-openvidu-token')
    const result = await getOpenViduToken({ meetingId: MEETING_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('OPENVIDU_ERROR')
  })

  it('invokes the correct edge function name', async () => {
    const { getOpenViduToken } = await import('./get-openvidu-token')
    await getOpenViduToken({ meetingId: MEETING_ID })

    expect(mockInvoke).toHaveBeenCalledWith('get-openvidu-token', {
      body: { meetingId: MEETING_ID },
    })
  })
})

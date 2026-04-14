import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockSingle = vi.fn()
const mockEq = vi.fn(() => ({ single: mockSingle }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))
const mockCreateSignedUrl = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: mockCreateSignedUrl,
      })),
    },
  })),
}))

const RECORDING_ID = '00000000-0000-0000-0000-000000000001'

describe('downloadRecording Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null })
    mockSingle.mockResolvedValue({
      data: { recording_url: 'session-abc/rec-123.mp4' },
      error: null,
    })
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://storage.example.com/signed-url' },
      error: null,
    })
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } })

    const { downloadRecording } = await import('./download-recording')
    const result = await downloadRecording({ recordingId: RECORDING_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for invalid recordingId', async () => {
    const { downloadRecording } = await import('./download-recording')
    const result = await downloadRecording({ recordingId: 'bad' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns NOT_FOUND when recording does not exist', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

    const { downloadRecording } = await import('./download-recording')
    const result = await downloadRecording({ recordingId: RECORDING_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns signed URL on success', async () => {
    const { downloadRecording } = await import('./download-recording')
    const result = await downloadRecording({ recordingId: RECORDING_ID })

    expect(result.error).toBeNull()
    expect(result.data?.signedUrl).toBe('https://storage.example.com/signed-url')
  })

  it('returns STORAGE_ERROR when signed URL generation fails', async () => {
    mockCreateSignedUrl.mockResolvedValue({ data: null, error: { message: 'Storage error' } })

    const { downloadRecording } = await import('./download-recording')
    const result = await downloadRecording({ recordingId: RECORDING_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('STORAGE_ERROR')
  })
})

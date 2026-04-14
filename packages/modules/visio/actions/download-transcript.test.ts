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

describe('downloadTranscript Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null })
    mockSingle.mockResolvedValue({
      data: { transcript_url: 'rec-123.srt', transcription_status: 'completed' },
      error: null,
    })
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://storage.example.com/signed-transcript-url' },
      error: null,
    })
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } })

    const { downloadTranscript } = await import('./download-transcript')
    const result = await downloadTranscript({ recordingId: RECORDING_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for invalid recordingId', async () => {
    const { downloadTranscript } = await import('./download-transcript')
    const result = await downloadTranscript({ recordingId: 'bad' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns NOT_FOUND when recording does not exist', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

    const { downloadTranscript } = await import('./download-transcript')
    const result = await downloadTranscript({ recordingId: RECORDING_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns NOT_READY when transcription is not completed', async () => {
    mockSingle.mockResolvedValue({
      data: { transcript_url: null, transcription_status: 'pending' },
      error: null,
    })

    const { downloadTranscript } = await import('./download-transcript')
    const result = await downloadTranscript({ recordingId: RECORDING_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_READY')
  })

  it('returns signed URL on success', async () => {
    const { downloadTranscript } = await import('./download-transcript')
    const result = await downloadTranscript({ recordingId: RECORDING_ID })

    expect(result.error).toBeNull()
    expect(result.data?.signedUrl).toBe('https://storage.example.com/signed-transcript-url')
  })

  it('returns STORAGE_ERROR when signed URL generation fails', async () => {
    mockCreateSignedUrl.mockResolvedValue({ data: null, error: { message: 'Storage error' } })

    const { downloadTranscript } = await import('./download-transcript')
    const result = await downloadTranscript({ recordingId: RECORDING_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('STORAGE_ERROR')
  })
})

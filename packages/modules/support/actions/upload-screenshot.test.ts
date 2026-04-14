import { describe, it, expect, vi, beforeEach } from 'vitest'

const testAuthUserId = '550e8400-e29b-41d4-a716-446655440003'

// Mock crypto.randomUUID
vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid-1234' })

// Mock Supabase Storage
const mockGetPublicUrl = vi.fn(() => ({ data: { publicUrl: `https://storage.test/screenshots/${testAuthUserId}/test-uuid-1234.png` } }))
const mockUpload = vi.fn()

const mockGetUser = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    storage: {
      from: vi.fn(() => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      })),
    },
  })),
}))

function createMockFile(name: string, size: number, type: string): File {
  const buffer = new ArrayBuffer(size)
  return new File([buffer], name, { type })
}

describe('uploadScreenshot Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockUpload.mockResolvedValue({ data: { path: `${testAuthUserId}/test-uuid-1234.png` }, error: null })
  })

  it('should return VALIDATION_ERROR when no file provided', async () => {
    const formData = new FormData()

    const { uploadScreenshot } = await import('./upload-screenshot')
    const result = await uploadScreenshot(formData)

    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should return VALIDATION_ERROR for unsupported file type', async () => {
    const file = createMockFile('test.gif', 1024, 'image/gif')
    const formData = new FormData()
    formData.append('screenshot', file)

    const { uploadScreenshot } = await import('./upload-screenshot')
    const result = await uploadScreenshot(formData)

    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.error?.message).toContain('Format non supporté')
  })

  it('should return VALIDATION_ERROR for file exceeding 5MB', async () => {
    const file = createMockFile('big.png', 6 * 1024 * 1024, 'image/png')
    const formData = new FormData()
    formData.append('screenshot', file)

    const { uploadScreenshot } = await import('./upload-screenshot')
    const result = await uploadScreenshot(formData)

    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.error?.message).toContain('5 Mo')
  })

  it('should return UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No auth' } })
    const file = createMockFile('test.png', 1024, 'image/png')
    const formData = new FormData()
    formData.append('screenshot', file)

    const { uploadScreenshot } = await import('./upload-screenshot')
    const result = await uploadScreenshot(formData)

    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should upload file and return public URL on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testAuthUserId } }, error: null })
    const file = createMockFile('capture.png', 2048, 'image/png')
    const formData = new FormData()
    formData.append('screenshot', file)

    const { uploadScreenshot } = await import('./upload-screenshot')
    const result = await uploadScreenshot(formData)

    expect(result.error).toBeNull()
    expect(result.data).toBe(`https://storage.test/screenshots/${testAuthUserId}/test-uuid-1234.png`)
    expect(mockUpload).toHaveBeenCalledWith(
      `${testAuthUserId}/test-uuid-1234.png`,
      expect.any(File),
      { contentType: 'image/png' }
    )
  })

  it('should handle storage upload error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testAuthUserId } }, error: null })
    mockUpload.mockResolvedValue({ data: null, error: { message: 'Storage full' } })
    const file = createMockFile('test.jpg', 1024, 'image/jpeg')
    const formData = new FormData()
    formData.append('screenshot', file)

    const { uploadScreenshot } = await import('./upload-screenshot')
    const result = await uploadScreenshot(formData)

    expect(result.error?.code).toBe('STORAGE_ERROR')
  })

  it('should accept webp images', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testAuthUserId } }, error: null })
    const file = createMockFile('test.webp', 1024, 'image/webp')
    const formData = new FormData()
    formData.append('screenshot', file)

    const { uploadScreenshot } = await import('./upload-screenshot')
    const result = await uploadScreenshot(formData)

    expect(result.error).toBeNull()
  })
})

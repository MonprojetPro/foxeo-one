import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUpload = vi.fn()
const mockGetPublicUrl = vi.fn()
const mockStorageFrom = vi.fn(() => ({
  upload: mockUpload,
  getPublicUrl: mockGetPublicUrl,
}))

const mockClientSingle = vi.fn()
const mockClientEq2 = vi.fn(() => ({ single: mockClientSingle }))
const mockClientEq1 = vi.fn(() => ({ eq: mockClientEq2 }))
const mockClientSelect = vi.fn(() => ({ eq: mockClientEq1 }))

const mockOpSingle = vi.fn()
const mockOpEq = vi.fn(() => ({ single: mockOpSingle }))
const mockOpSelect = vi.fn(() => ({ eq: mockOpEq }))

const mockGetUser = vi.fn()

const mockFrom = vi.fn((table: string) => {
  if (table === 'operators') return { select: mockOpSelect }
  if (table === 'clients') return { select: mockClientSelect }
  return { select: vi.fn() }
})

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    storage: { from: mockStorageFrom },
  })),
}))

function setupAuthMocks() {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null })
  mockOpSingle.mockResolvedValue({ data: { id: 'op-1' }, error: null })
  mockClientSingle.mockResolvedValue({ data: { id: 'client-1', operator_id: 'op-1' }, error: null })
}

function makeFormData(file: File): FormData {
  const fd = new FormData()
  fd.append('file', file)
  return fd
}

function makePngFile(size = 1024): File {
  return new File([new ArrayBuffer(size)], 'logo.png', { type: 'image/png' })
}

function makeSvgFile(): File {
  return new File(['<svg></svg>'], 'logo.svg', { type: 'image/svg+xml' })
}

describe('uploadClientLogo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns VALIDATION_ERROR for invalid clientId', async () => {
    const { uploadClientLogo } = await import('./upload-client-logo')
    const result = await uploadClientLogo('bad-id', makeFormData(makePngFile()))
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns VALIDATION_ERROR when no file in FormData', async () => {
    const { uploadClientLogo } = await import('./upload-client-logo')
    const result = await uploadClientLogo('a0000000-0000-0000-0000-000000000001', new FormData())
    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.error?.message).toBe('Fichier requis')
  })

  it('returns INVALID_FILE_TYPE for unsupported format', async () => {
    const { uploadClientLogo } = await import('./upload-client-logo')
    const jpgFile = new File(['data'], 'logo.jpg', { type: 'image/jpeg' })
    const result = await uploadClientLogo('a0000000-0000-0000-0000-000000000001', makeFormData(jpgFile))
    expect(result.error?.code).toBe('INVALID_FILE_TYPE')
  })

  it('returns FILE_TOO_LARGE when file exceeds 10 Mo', async () => {
    const { uploadClientLogo } = await import('./upload-client-logo')
    const bigFile = makePngFile(11 * 1024 * 1024)
    const result = await uploadClientLogo('a0000000-0000-0000-0000-000000000001', makeFormData(bigFile))
    expect(result.error?.code).toBe('FILE_TOO_LARGE')
  })

  it('uploads PNG file successfully', async () => {
    setupAuthMocks()
    mockUpload.mockResolvedValue({ error: null })
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://storage.example.com/logo.png' } })
    const { uploadClientLogo } = await import('./upload-client-logo')
    const result = await uploadClientLogo('a0000000-0000-0000-0000-000000000001', makeFormData(makePngFile()))
    expect(result.error).toBeNull()
    expect(result.data?.logoUrl).toBe('https://storage.example.com/logo.png')
    expect(mockUpload).toHaveBeenCalledWith(
      'clients/a0000000-0000-0000-0000-000000000001/branding/logo.png',
      expect.any(File),
      { upsert: true },
    )
  })

  it('uploads SVG file with correct extension', async () => {
    setupAuthMocks()
    mockUpload.mockResolvedValue({ error: null })
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://storage.example.com/logo.svg' } })
    const { uploadClientLogo } = await import('./upload-client-logo')
    const result = await uploadClientLogo('a0000000-0000-0000-0000-000000000001', makeFormData(makeSvgFile()))
    expect(result.error).toBeNull()
    expect(mockUpload).toHaveBeenCalledWith(
      'clients/a0000000-0000-0000-0000-000000000001/branding/logo.svg',
      expect.any(File),
      { upsert: true },
    )
  })

  it('returns STORAGE_ERROR when upload fails', async () => {
    setupAuthMocks()
    mockUpload.mockResolvedValue({ error: { message: 'Storage error' } })
    const { uploadClientLogo } = await import('./upload-client-logo')
    const result = await uploadClientLogo('a0000000-0000-0000-0000-000000000001', makeFormData(makePngFile()))
    expect(result.error?.code).toBe('STORAGE_ERROR')
  })

  it('returns UNAUTHORIZED when no user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No user' } })
    const { uploadClientLogo } = await import('./upload-client-logo')
    const result = await uploadClientLogo('a0000000-0000-0000-0000-000000000001', makeFormData(makePngFile()))
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })
})

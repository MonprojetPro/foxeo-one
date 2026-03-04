import { describe, it, expect, vi, beforeEach } from 'vitest'
import { convertToPdf } from './convert-to-pdf'

const mockCreateSignedUrl = vi.fn()
const mockUpload = vi.fn()
const mockFrom = vi.fn()

vi.mock('@foxeo/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    storage: {
      from: mockFrom,
    },
  })),
}))

vi.mock('@foxeo/types', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    successResponse: (data: unknown) => ({ data, error: null }),
    errorResponse: (message: string, code: string, details?: unknown) => ({
      data: null,
      error: { message, code, details },
    }),
  }
})

describe('convertToPdf (Story 8.9b — Task 6)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://storage.example.com/signed-url' },
      error: null,
    })
    mockUpload.mockResolvedValue({
      data: { path: 'generated/client-1/attestation-123456.html' },
      error: null,
    })
    mockFrom.mockReturnValue({
      upload: mockUpload,
      createSignedUrl: mockCreateSignedUrl,
    })
  })

  it('Task 9.4 — retourne VALIDATION_ERROR si paramètres manquants', async () => {
    const result = await convertToPdf('', 'attestation', 'client-1')
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('Task 9.4 — uploade le document dans Supabase Storage', async () => {
    await convertToPdf('Contenu du document', 'attestation', 'client-1')

    expect(mockFrom).toHaveBeenCalledWith('documents')
    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringContaining('generated/client-1/'),
      expect.any(Buffer),
      expect.objectContaining({ contentType: expect.stringContaining('text/html') })
    )
  })

  it('Task 9.4 — retourne une signed URL', async () => {
    const result = await convertToPdf('Contenu du document', 'attestation', 'client-1')
    expect(result.data).toBe('https://storage.example.com/signed-url')
    expect(result.error).toBeNull()
  })

  it('Task 9.4 — retourne STORAGE_ERROR si upload échoue', async () => {
    mockUpload.mockResolvedValueOnce({ data: null, error: { message: 'Storage error' } })

    const result = await convertToPdf('Contenu', 'attestation', 'client-1')
    expect(result.error?.code).toBe('STORAGE_ERROR')
  })

  it('Task 9.4 — retourne STORAGE_ERROR si signed URL échoue', async () => {
    mockCreateSignedUrl.mockResolvedValueOnce({ data: null, error: { message: 'URL error' } })

    const result = await convertToPdf('Contenu', 'attestation', 'client-1')
    expect(result.error?.code).toBe('STORAGE_ERROR')
  })
})

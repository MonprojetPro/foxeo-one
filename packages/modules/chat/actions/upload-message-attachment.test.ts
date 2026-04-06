import { describe, it, expect, vi, beforeEach } from 'vitest'
import { uploadMessageAttachment } from './upload-message-attachment'

const mockUpload = vi.fn()
const mockCreateSignedUrl = vi.fn()
const mockRemove = vi.fn()
const mockGetUser = vi.fn()

vi.mock('@foxeo/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    storage: {
      from: vi.fn(() => ({
        upload: mockUpload,
        createSignedUrl: mockCreateSignedUrl,
        remove: mockRemove,
      })),
    },
  })),
}))

function makeFormData(file: File | null, clientId = 'client-uuid', operatorId = 'operator-uuid') {
  const fd = new FormData()
  if (file) fd.append('file', file)
  fd.append('clientId', clientId)
  fd.append('operatorId', operatorId)
  return fd
}

function makePngFile(name = 'test.png', size = 1024) {
  return new File([new Uint8Array(size)], name, { type: 'image/png' })
}

describe('uploadMessageAttachment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockUpload.mockResolvedValue({ data: { path: 'op-id/client-id/uuid.png' }, error: null })
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://supabase.co/signed/uuid.png' },
      error: null,
    })
  })

  it('retourne une erreur si non authentifié', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('auth') })
    const result = await uploadMessageAttachment(makeFormData(makePngFile()))
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('retourne une erreur si pas de fichier', async () => {
    const result = await uploadMessageAttachment(makeFormData(null))
    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.error?.message).toContain('Aucun fichier')
  })

  it('retourne une erreur pour type non autorisé', async () => {
    const file = new File(['data'], 'test.exe', { type: 'application/x-msdownload' })
    const result = await uploadMessageAttachment(makeFormData(file))
    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.error?.message).toContain('non autorisé')
  })

  it('retourne une erreur si fichier > 10 Mo', async () => {
    const file = new File([new Uint8Array(11 * 1024 * 1024)], 'big.png', { type: 'image/png' })
    const result = await uploadMessageAttachment(makeFormData(file))
    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.error?.message).toContain('volumineux')
  })

  it('retourne les données si upload réussi', async () => {
    const result = await uploadMessageAttachment(makeFormData(makePngFile()))
    expect(result.error).toBeNull()
    expect(result.data?.url).toBe('https://supabase.co/signed/uuid.png')
    expect(result.data?.name).toBe('test.png')
    expect(result.data?.type).toBe('image/png')
  })

  it('supprime le fichier si createSignedUrl échoue', async () => {
    mockCreateSignedUrl.mockResolvedValueOnce({ data: null, error: new Error('sign error') })
    const result = await uploadMessageAttachment(makeFormData(makePngFile()))
    expect(result.error?.code).toBe('STORAGE_ERROR')
    expect(mockRemove).toHaveBeenCalled()
  })

  it('accepte les fichiers PDF', async () => {
    const pdfFile = new File(['%PDF'], 'document.pdf', { type: 'application/pdf' })
    const result = await uploadMessageAttachment(makeFormData(pdfFile))
    expect(result.error).toBeNull()
    expect(result.data?.type).toBe('application/pdf')
  })
})

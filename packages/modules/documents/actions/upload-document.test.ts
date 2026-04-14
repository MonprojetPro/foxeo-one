import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActionResponse } from '@monprojetpro/types'
import type { Document } from '../types/document.types'

const mockGetUser = vi.fn()

// Auth check chain
const mockAuthSingle = vi.fn()
const mockAuthEq2 = vi.fn(() => ({ single: mockAuthSingle }))
const mockAuthEq1 = vi.fn(() => ({ eq: mockAuthEq2 }))
const mockAuthSelect = vi.fn(() => ({ eq: mockAuthEq1 }))

// Insert chain: from('documents').insert().select().single()
const mockInsertSingle = vi.fn()
const mockInsertSelect = vi.fn(() => ({ single: mockInsertSingle }))
const mockInsert = vi.fn(() => ({ select: mockInsertSelect }))

// Storage
const mockStorageUpload = vi.fn()
const mockStorageRemove = vi.fn()

const mockFrom = vi.fn((table: string) => {
  if (table === 'operators' || table === 'clients') {
    return { select: mockAuthSelect }
  }
  return { insert: mockInsert }
})

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
    storage: {
      from: () => ({
        upload: mockStorageUpload,
        remove: mockStorageRemove,
      }),
    },
  })),
}))

// Mock validateFile to use real implementation
vi.mock('@monprojetpro/utils', async () => {
  const actual = await vi.importActual<typeof import('@monprojetpro/utils')>('@monprojetpro/utils')
  return actual
})

const CLIENT_ID = '00000000-0000-0000-0000-000000000001'
const OPERATOR_ID = '00000000-0000-0000-0000-000000000002'

function createFormData(overrides?: Record<string, string>): FormData {
  const formData = new FormData()
  const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
  formData.set('file', file)
  formData.set('clientId', overrides?.clientId ?? CLIENT_ID)
  formData.set('operatorId', overrides?.operatorId ?? OPERATOR_ID)
  formData.set('uploadedBy', overrides?.uploadedBy ?? 'operator')
  formData.set('visibility', overrides?.visibility ?? 'private')
  return formData
}

describe('uploadDocument Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null })
    mockAuthSingle.mockResolvedValue({ data: { id: OPERATOR_ID }, error: null })
    mockStorageUpload.mockResolvedValue({ data: { path: `${OPERATOR_ID}/${CLIENT_ID}/uuid-test.pdf` }, error: null })
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } })

    const { uploadDocument } = await import('./upload-document')
    const result: ActionResponse<Document> = await uploadDocument(createFormData())

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR when no file is provided', async () => {
    const formData = new FormData()
    formData.set('clientId', CLIENT_ID)
    formData.set('operatorId', OPERATOR_ID)
    formData.set('uploadedBy', 'operator')

    const { uploadDocument } = await import('./upload-document')
    const result = await uploadDocument(formData)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.error?.message).toContain('Aucun fichier')
  })

  it('returns VALIDATION_ERROR for invalid file type', async () => {
    const formData = new FormData()
    const file = new File(['test'], 'malware.exe', { type: 'application/x-msdownload' })
    formData.set('file', file)
    formData.set('clientId', CLIENT_ID)
    formData.set('operatorId', OPERATOR_ID)
    formData.set('uploadedBy', 'operator')

    const { uploadDocument } = await import('./upload-document')
    const result = await uploadDocument(formData)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.error?.message).toContain('non autorisé')
  })

  it('returns VALIDATION_ERROR for file exceeding max size', async () => {
    const formData = new FormData()
    const bigBuffer = new ArrayBuffer(11 * 1024 * 1024)
    const file = new File([bigBuffer], 'huge.pdf', { type: 'application/pdf' })
    formData.set('file', file)
    formData.set('clientId', CLIENT_ID)
    formData.set('operatorId', OPERATOR_ID)
    formData.set('uploadedBy', 'operator')

    const { uploadDocument } = await import('./upload-document')
    const result = await uploadDocument(formData)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.error?.message).toContain('volumineux')
  })

  it('returns FORBIDDEN when operator identity does not match', async () => {
    mockAuthSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })

    const { uploadDocument } = await import('./upload-document')
    const result = await uploadDocument(createFormData())

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it('returns the created document on success', async () => {
    const fixedDate = '2026-02-18T10:00:00.000Z'
    mockInsertSingle.mockResolvedValue({
      data: {
        id: '00000000-0000-0000-0000-000000000099',
        client_id: CLIENT_ID,
        operator_id: OPERATOR_ID,
        name: 'test.pdf',
        file_path: `${OPERATOR_ID}/${CLIENT_ID}/uuid-test.pdf`,
        file_type: 'pdf',
        file_size: 12,
        folder_id: null,
        tags: [],
        visibility: 'private',
        uploaded_by: 'operator',
        created_at: fixedDate,
        updated_at: fixedDate,
      },
      error: null,
    })

    const { uploadDocument } = await import('./upload-document')
    const result = await uploadDocument(createFormData())

    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()
    expect(result.data?.name).toBe('test.pdf')
    expect(result.data?.fileType).toBe('pdf')
    expect(result.data?.clientId).toBe(CLIENT_ID)
    expect(result.data?.uploadedBy).toBe('operator')
  })

  it('returns STORAGE_ERROR when upload fails', async () => {
    mockStorageUpload.mockResolvedValue({ data: null, error: { message: 'Storage full' } })

    const { uploadDocument } = await import('./upload-document')
    const result = await uploadDocument(createFormData())

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('STORAGE_ERROR')
  })

  it('cleans up storage file when DB insert fails', async () => {
    mockInsertSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { uploadDocument } = await import('./upload-document')
    const result = await uploadDocument(createFormData())

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
    expect(mockStorageRemove).toHaveBeenCalled()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockGenerateZip = vi.fn()

// Chaîne pour from('operators').select().eq().single()
const mockOperatorSingle = vi.fn()
const mockOperatorEq = vi.fn(() => ({ single: mockOperatorSingle }))
const mockOperatorSelect = vi.fn(() => ({ eq: mockOperatorEq }))

// Chaîne pour from('clients').select().eq('id').eq('operator_id').single()
const mockClientSingle = vi.fn()
const mockClientEqOperator = vi.fn(() => ({ single: mockClientSingle }))
const mockClientEqId = vi.fn(() => ({ eq: mockClientEqOperator }))
const mockClientSelect = vi.fn(() => ({ eq: mockClientEqId }))

// Chaîne pour from('documents').select().eq('client_id').eq('visibility')
const mockDocsResult = vi.fn()
const mockDocsEqVisibility = vi.fn(() => mockDocsResult())
const mockDocsEqClientId = vi.fn(() => ({ eq: mockDocsEqVisibility }))
const mockDocsSelect = vi.fn(() => ({ eq: mockDocsEqClientId }))

// Chaîne pour from('documents').update().in()
const mockUpdateIn = vi.fn()
const mockUpdate = vi.fn(() => ({ in: mockUpdateIn }))

// Chaîne pour from('activity_logs').insert()
const mockActivityInsert = vi.fn()

// Chaîne Storage: createSignedUrl
const mockCreateSignedUrl = vi.fn()
const mockStorageBucket = vi.fn(() => ({ createSignedUrl: mockCreateSignedUrl }))

const mockFrom = vi.fn((table: string) => {
  if (table === 'operators') return { select: mockOperatorSelect }
  if (table === 'clients') return { select: mockClientSelect }
  if (table === 'activity_logs') return { insert: mockActivityInsert }
  if (table === 'documents') {
    return {
      select: mockDocsSelect,
      update: mockUpdate,
    }
  }
  return {}
})

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    storage: { from: mockStorageBucket },
  })),
}))

vi.mock('../utils/zip-generator', () => ({
  generateZipFromDocuments: mockGenerateZip,
}))

const OPERATOR_ID = '00000000-0000-0000-0000-000000000001'
const CLIENT_ID = '00000000-0000-0000-0000-000000000002'
const DOC_ID_1 = '00000000-0000-0000-0000-000000000003'
const DOC_ID_2 = '00000000-0000-0000-0000-000000000004'
const FIXED_DATE = '2026-02-20T10:00:00.000Z'

const MOCK_DOC_DB = {
  id: DOC_ID_1,
  client_id: CLIENT_ID,
  operator_id: OPERATOR_ID,
  name: 'rapport.pdf',
  file_path: 'op/client/rapport.pdf',
  file_type: 'pdf',
  file_size: 1024,
  folder_id: null,
  tags: [],
  visibility: 'shared',
  uploaded_by: 'operator',
  created_at: FIXED_DATE,
  updated_at: FIXED_DATE,
  last_synced_at: null,
}

function setupDefaults() {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-user-id' } }, error: null })
  mockOperatorSingle.mockResolvedValue({ data: { id: OPERATOR_ID }, error: null })
  mockClientSingle.mockResolvedValue({ data: { id: CLIENT_ID }, error: null })
  mockDocsResult.mockResolvedValue({ data: [MOCK_DOC_DB], error: null })
  mockCreateSignedUrl.mockResolvedValue({
    data: { signedUrl: 'https://storage.example.com/signed/rapport.pdf' },
    error: null,
  })
  mockGenerateZip.mockResolvedValue(Buffer.from('FAKE_ZIP_DATA'))
  mockUpdateIn.mockResolvedValue({ data: null, error: null })
  mockActivityInsert.mockResolvedValue({ data: null, error: null })
}

describe('syncDocumentsToZip Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    setupDefaults()
  })

  it('retourne UNAUTHORIZED quand non authentifié', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const { syncDocumentsToZip } = await import('./sync-documents-to-zip')
    const result = await syncDocumentsToZip(CLIENT_ID)
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('retourne FORBIDDEN quand user n\'est pas opérateur', async () => {
    mockOperatorSingle.mockResolvedValue({ data: null, error: null })
    const { syncDocumentsToZip } = await import('./sync-documents-to-zip')
    const result = await syncDocumentsToZip(CLIENT_ID)
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it('retourne NOT_FOUND quand le client n\'existe pas', async () => {
    mockClientSingle.mockResolvedValue({ data: null, error: null })
    const { syncDocumentsToZip } = await import('./sync-documents-to-zip')
    const result = await syncDocumentsToZip(CLIENT_ID)
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('retourne un ZIP vide (base64) quand 0 document partagé', async () => {
    mockDocsResult.mockResolvedValue({ data: [], error: null })
    mockGenerateZip.mockResolvedValue(Buffer.from('EMPTY_ZIP'))
    const { syncDocumentsToZip } = await import('./sync-documents-to-zip')
    const result = await syncDocumentsToZip(CLIENT_ID)
    expect(result.error).toBeNull()
    expect(result.data?.count).toBe(0)
    expect(typeof result.data?.zipBase64).toBe('string')
    expect(result.data?.zipBase64.length).toBeGreaterThan(0)
    // generateZipFromDocuments EST appelé même pour 0 docs (M3 fix)
    expect(mockGenerateZip).toHaveBeenCalledWith([])
  })

  it('retourne zipBase64 et count avec N documents', async () => {
    const { syncDocumentsToZip } = await import('./sync-documents-to-zip')
    const result = await syncDocumentsToZip(CLIENT_ID)
    expect(result.error).toBeNull()
    expect(result.data?.count).toBe(1)
    expect(typeof result.data?.zipBase64).toBe('string')
    // Doit être un base64 valide
    expect(() => Buffer.from(result.data!.zipBase64, 'base64')).not.toThrow()
    expect(mockUpdateIn).toHaveBeenCalled()
    expect(mockActivityInsert).toHaveBeenCalled()
  })

  it('retourne STORAGE_ERROR si signed URL échoue', async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: null,
      error: { message: 'Storage error' },
    })
    const { syncDocumentsToZip } = await import('./sync-documents-to-zip')
    const result = await syncDocumentsToZip(CLIENT_ID)
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('STORAGE_ERROR')
  })

  it('retourne VALIDATION_ERROR pour un clientId invalide (non UUID)', async () => {
    const { syncDocumentsToZip } = await import('./sync-documents-to-zip')
    const result = await syncDocumentsToZip('not-a-uuid')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })
})

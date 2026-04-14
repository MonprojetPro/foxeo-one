import { describe, it, expect, vi, beforeEach } from 'vitest'

// -- Document query chain: from('documents').select().eq('client_id').is('deleted_at').order() --
const mockDocOrder = vi.fn()
const mockDocIs = vi.fn(() => ({ order: mockDocOrder }))
const mockDocEq = vi.fn(() => ({ is: mockDocIs }))
const mockDocSelect = vi.fn(() => ({ eq: mockDocEq }))

// -- Folder query chain: from('document_folders').select().eq('client_id') --
const mockFolderEq = vi.fn()
const mockFolderSelect = vi.fn(() => ({ eq: mockFolderEq }))

const mockGetUser = vi.fn()
const mockFrom = vi.fn((table: string) => {
  if (table === 'documents') return { select: mockDocSelect }
  if (table === 'document_folders') return { select: mockFolderSelect }
  return {}
})

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

vi.mock('../utils/csv-generator', () => ({
  generateDocumentsCsv: vi.fn(() => '\uFEFFNom,Type\nrapport.pdf,pdf'),
}))

const CLIENT_ID = '00000000-0000-0000-0000-000000000001'
const FIXED_DATE = '2026-02-19T10:00:00.000Z'

const MOCK_DOC_DB = {
  id: '00000000-0000-0000-0000-000000000010',
  client_id: CLIENT_ID,
  operator_id: '00000000-0000-0000-0000-000000000003',
  name: 'rapport.pdf',
  file_path: 'op/client/rapport.pdf',
  file_type: 'pdf',
  file_size: 1024,
  folder_id: null,
  tags: [],
  visibility: 'private',
  uploaded_by: 'operator',
  created_at: FIXED_DATE,
  updated_at: FIXED_DATE,
  last_synced_at: null,
  deleted_at: null,
}

function setupDefaults() {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-user-id' } }, error: null })
  mockDocOrder.mockResolvedValue({ data: [MOCK_DOC_DB], error: null })
  mockFolderEq.mockResolvedValue({ data: [], error: null })
}

describe('exportDocumentsCSV Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    setupDefaults()
  })

  it('retourne UNAUTHORIZED quand non authentifié', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const { exportDocumentsCSV } = await import('./export-documents-csv')
    const result = await exportDocumentsCSV(CLIENT_ID)
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('retourne VALIDATION_ERROR pour un clientId non UUID', async () => {
    const { exportDocumentsCSV } = await import('./export-documents-csv')
    const result = await exportDocumentsCSV('not-a-uuid')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne CSV avec en-têtes pour 0 documents', async () => {
    mockDocOrder.mockResolvedValue({ data: [], error: null })
    const { exportDocumentsCSV } = await import('./export-documents-csv')
    const result = await exportDocumentsCSV(CLIENT_ID)
    expect(result.error).toBeNull()
    expect(result.data?.count).toBe(0)
    expect(result.data?.csvContent).toBeTruthy()
  })

  it('retourne CSV avec données pour N documents', async () => {
    const { exportDocumentsCSV } = await import('./export-documents-csv')
    const result = await exportDocumentsCSV(CLIENT_ID)
    expect(result.error).toBeNull()
    expect(result.data?.count).toBe(1)
    expect(result.data?.csvContent).toBeTruthy()
  })

  it('nom de fichier dynamique contient le préfixe clientId et la date', async () => {
    const { exportDocumentsCSV } = await import('./export-documents-csv')
    const result = await exportDocumentsCSV(CLIENT_ID)
    expect(result.error).toBeNull()
    const today = new Date().toISOString().split('T')[0]
    expect(result.data?.fileName).toBe(`documents-${CLIENT_ID.slice(0, 8)}-${today}.csv`)
  })
})

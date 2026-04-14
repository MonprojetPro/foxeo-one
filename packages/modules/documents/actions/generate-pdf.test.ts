import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockCreateSignedUrl = vi.fn()

const mockSingle = vi.fn()
const mockEq = vi.fn(() => ({ single: mockSingle }))
const mockSelectAll = vi.fn(() => ({ eq: mockEq }))

const mockFrom = vi.fn(() => ({
  select: mockSelectAll,
}))

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
    storage: { from: vi.fn(() => ({ createSignedUrl: mockCreateSignedUrl })) },
  })),
}))

// Mock global fetch for downloading Markdown content
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const DOC_ID = '00000000-0000-0000-0000-000000000001'
const FIXED_DATE = '2026-02-18T10:00:00.000Z'

const MARKDOWN_DOC = {
  id: DOC_ID,
  client_id: '00000000-0000-0000-0000-000000000002',
  operator_id: 'op-id',
  name: 'guide.md',
  file_path: 'op-id/client-id/uuid-guide.md',
  file_type: 'md',
  file_size: 512,
  folder_id: null,
  tags: [],
  visibility: 'shared',
  uploaded_by: 'operator',
  created_at: FIXED_DATE,
  updated_at: FIXED_DATE,
}

const PDF_DOC = {
  ...MARKDOWN_DOC,
  name: 'rapport.pdf',
  file_path: 'op-id/client-id/uuid-rapport.pdf',
  file_type: 'pdf',
}

describe('generatePdf Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null })
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } })

    const { generatePdf } = await import('./generate-pdf')
    const result = await generatePdf({ documentId: DOC_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for invalid documentId', async () => {
    const { generatePdf } = await import('./generate-pdf')
    const result = await generatePdf({ documentId: 'invalid' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns NOT_FOUND when document does not exist', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

    const { generatePdf } = await import('./generate-pdf')
    const result = await generatePdf({ documentId: DOC_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns UNSUPPORTED_FORMAT for non-Markdown files', async () => {
    mockSingle.mockResolvedValue({ data: PDF_DOC, error: null })

    const { generatePdf } = await import('./generate-pdf')
    const result = await generatePdf({ documentId: DOC_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNSUPPORTED_FORMAT')
  })

  it('returns branded HTML content on success for Markdown', async () => {
    mockSingle.mockResolvedValue({ data: MARKDOWN_DOC, error: null })
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://storage.example.com/signed/guide.md' },
      error: null,
    })
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('# Mon Guide\n\nContenu du guide.'),
    })

    const { generatePdf } = await import('./generate-pdf')
    const result = await generatePdf({ documentId: DOC_ID })

    expect(result.error).toBeNull()
    expect(result.data?.htmlContent).toContain('MonprojetPro')
    expect(result.data?.htmlContent).toContain('Mon Guide')
    expect(result.data?.htmlContent).toContain('Généré depuis MonprojetPro')
    expect(result.data?.htmlContent).toContain('guide.md')
    expect(result.data?.fileName).toBe('guide.pdf')
  })

  it('returns STORAGE_ERROR when signed URL fails', async () => {
    mockSingle.mockResolvedValue({ data: MARKDOWN_DOC, error: null })
    mockCreateSignedUrl.mockResolvedValue({ data: null, error: { message: 'Storage error' } })

    const { generatePdf } = await import('./generate-pdf')
    const result = await generatePdf({ documentId: DOC_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('STORAGE_ERROR')
  })

  it('returns FETCH_ERROR when content download fails', async () => {
    mockSingle.mockResolvedValue({ data: MARKDOWN_DOC, error: null })
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://storage.example.com/signed/guide.md' },
      error: null,
    })
    mockFetch.mockResolvedValue({ ok: false, status: 500 })

    const { generatePdf } = await import('./generate-pdf')
    const result = await generatePdf({ documentId: DOC_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('FETCH_ERROR')
  })
})

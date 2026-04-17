import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { uploadJustificatif } from './upload-justificatif'

const mockCreateServerSupabaseClient = vi.mocked(createServerSupabaseClient)

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeFile(name: string, size: number, type: string): File {
  const buffer = new ArrayBuffer(size)
  return new File([buffer], name, { type })
}

function makeFormData(file: File): FormData {
  const fd = new FormData()
  fd.append('file', file)
  return fd
}

function makeSupabase(opts: { isOperator?: boolean; configRows?: Array<{ key: string; value: unknown }> } = {}) {
  const insertMock = vi.fn()
  const insertSelectSingle = vi.fn().mockResolvedValue({ data: { id: 'upload-1' }, error: null })
  const insertSelect = vi.fn(() => ({ single: insertSelectSingle }))
  insertMock.mockReturnValue({ select: insertSelect })

  const configIn = vi.fn()
  const selectMock = vi.fn(() => ({ in: configIn }))

  // Default: config rows present
  const rows = opts.configRows ?? [
    { key: 'google_drive_access_token', value: JSON.stringify('test-access-token') },
    { key: 'google_drive_refresh_token', value: JSON.stringify('test-refresh-token') },
    { key: 'google_drive_folder_id', value: JSON.stringify('folder-123') },
  ]
  configIn.mockReturnValue({ data: rows, error: null })

  const upsertMock = vi.fn().mockResolvedValue({ error: null })

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'op-1' } },
        error: null,
      }),
    },
    rpc: vi.fn().mockResolvedValue({ data: opts.isOperator ?? true }),
    from: vi.fn((table: string) => {
      if (table === 'system_config') return { select: selectMock, upsert: upsertMock }
      if (table === 'justificatif_uploads') return { insert: insertMock }
      return { insert: vi.fn().mockResolvedValue({ error: null }) }
    }),
    _mocks: { insertMock, insertSelectSingle, configIn, upsertMock },
  }
}

// Mock global fetch for Google Drive API
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('uploadJustificatif', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: Drive upload succeeds
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 'drive-file-abc' }),
    })
  })

  it('returns UNAUTHORIZED when not authenticated', async () => {
    const supabase = makeSupabase()
    supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'No session' } })
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as never)

    const result = await uploadJustificatif(makeFormData(makeFile('test.pdf', 100, 'application/pdf')))
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns FORBIDDEN when not operator', async () => {
    const supabase = makeSupabase({ isOperator: false })
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as never)

    const result = await uploadJustificatif(makeFormData(makeFile('test.pdf', 100, 'application/pdf')))
    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it('rejects missing file', async () => {
    const supabase = makeSupabase()
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as never)

    const fd = new FormData()
    const result = await uploadJustificatif(fd)
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('rejects invalid mime type', async () => {
    const supabase = makeSupabase()
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as never)

    const result = await uploadJustificatif(makeFormData(makeFile('test.docx', 100, 'application/vnd.openxmlformats')))
    expect(result.error?.code).toBe('INVALID_FILE_TYPE')
  })

  it('rejects file exceeding 10 Mo', async () => {
    const supabase = makeSupabase()
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as never)

    const result = await uploadJustificatif(makeFormData(makeFile('big.pdf', 11 * 1024 * 1024, 'application/pdf')))
    expect(result.error?.code).toBe('FILE_TOO_LARGE')
  })

  it('returns DRIVE_NOT_CONFIGURED when no config', async () => {
    const supabase = makeSupabase({ configRows: [] })
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as never)

    const result = await uploadJustificatif(makeFormData(makeFile('test.pdf', 100, 'application/pdf')))
    expect(result.error?.code).toBe('DRIVE_NOT_CONFIGURED')
  })

  it('uploads successfully and inserts DB record with correct payload', async () => {
    const supabase = makeSupabase()
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as never)

    const result = await uploadJustificatif(makeFormData(makeFile('facture.pdf', 500, 'application/pdf')))

    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      id: 'upload-1',
      fileName: 'facture.pdf',
      driveFileId: 'drive-file-abc',
    })

    // Verify Drive API was called
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('googleapis.com/upload/drive/v3/files'),
      expect.objectContaining({ method: 'POST' })
    )

    // Verify DB insert payload includes uploaded_by and correct fields
    expect(supabase._mocks.insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        uploaded_by: 'op-1',
        file_name: 'facture.pdf',
        file_size: 500,
        mime_type: 'application/pdf',
        drive_file_id: 'drive-file-abc',
        status: 'sent',
        error_message: null,
      })
    )
  })

  it('sanitizes filenames with accents, spaces, and special chars', async () => {
    const supabase = makeSupabase()
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as never)

    await uploadJustificatif(makeFormData(makeFile("Capture d'écran 2026 (copie).pdf", 100, 'application/pdf')))

    // The Drive API call should receive the sanitized filename
    const driveCall = mockFetch.mock.calls[0]
    const body = driveCall[1].body as string
    // Sanitized: no accents, spaces replaced by dash, parens replaced
    expect(body).toContain('Capture-d-ecran-2026-copie-.pdf')
    expect(body).not.toContain("d'écran")
  })

  it('refreshes token on 401 and retries', async () => {
    const supabase = makeSupabase()
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as never)

    process.env.GOOGLE_CLIENT_ID = 'test-client-id'
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'

    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 401, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ access_token: 'new-token' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ id: 'drive-file-retry' }) })

    const result = await uploadJustificatif(makeFormData(makeFile('test.pdf', 100, 'application/pdf')))

    expect(result.error).toBeNull()
    expect(result.data?.driveFileId).toBe('drive-file-retry')
    expect(mockFetch).toHaveBeenCalledTimes(3)

    delete process.env.GOOGLE_CLIENT_ID
    delete process.env.GOOGLE_CLIENT_SECRET
  })
})

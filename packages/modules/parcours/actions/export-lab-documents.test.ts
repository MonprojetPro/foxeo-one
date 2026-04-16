import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockDownload = vi.fn()
const mockStorageFrom = vi.fn(() => ({ download: mockDownload }))

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    storage: { from: mockStorageFrom },
  })),
}))

import { exportLabDocuments } from './export-lab-documents'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('exportLabDocuments', () => {
  it('exports documents from Storage', async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [
          { id: 'doc-1', name: 'brief.pdf', file_path: 'client-1/brief.pdf', file_type: 'pdf' },
        ],
        error: null,
      }),
    })

    const fileContent = new Blob(['test content'])
    mockDownload.mockResolvedValueOnce({ data: fileContent, error: null })

    const result = await exportLabDocuments('client-1')

    expect(result.data).toBeTruthy()
    expect(result.data!.count).toBe(1)
    expect(result.data!.files[0].name).toBe('brief.pdf')
  })

  it('returns empty for client with no documents', async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })

    const result = await exportLabDocuments('client-1')

    expect(result.data!.count).toBe(0)
    expect(result.data!.files).toHaveLength(0)
  })

  it('skips files that fail to download', async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [
          { id: 'doc-1', name: 'ok.pdf', file_path: 'c/ok.pdf', file_type: 'pdf' },
          { id: 'doc-2', name: 'missing.pdf', file_path: 'c/missing.pdf', file_type: 'pdf' },
        ],
        error: null,
      }),
    })

    mockDownload
      .mockResolvedValueOnce({ data: new Blob(['test']), error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'Not found' } })

    const result = await exportLabDocuments('client-1')

    expect(result.data!.count).toBe(1)
  })
})

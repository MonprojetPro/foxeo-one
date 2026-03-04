import { describe, it, expect, vi, beforeEach } from 'vitest'
import { saveGeneratedDocument } from './save-generated-document'

const mockSingle = vi.fn()
const mockSelect = vi.fn(() => ({ single: mockSingle }))
const mockInsert = vi.fn(() => ({ select: mockSelect }))
const mockUpdate = vi.fn()
const mockEq = vi.fn()
// Mock for fetching existing metadata before merge
const mockSelectMetadata = vi.fn()
const mockEqMetadata = vi.fn()
const mockSingleMetadata = vi.fn()
const mockFrom = vi.fn()

vi.mock('@foxeo/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: mockFrom,
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

vi.mock('@foxeo/utils', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    toCamelCase: (data: unknown) => data,
  }
})

describe('saveGeneratedDocument (Story 8.9b — Task 5)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEq.mockReturnValue({ error: null })
    mockUpdate.mockReturnValue({ eq: mockEq })
    mockSingleMetadata.mockResolvedValue({ data: { metadata: { feedback: { rating: 'useful' } } } })
    mockEqMetadata.mockReturnValue({ single: mockSingleMetadata })
    mockSelectMetadata.mockReturnValue({ eq: mockEqMetadata })
    mockSingle.mockResolvedValue({
      data: {
        id: 'doc-123',
        client_id: 'client-1',
        title: 'Attestation de présence',
        content: 'Contenu du document',
        source: 'elio_generated',
        created_at: '2026-03-04T10:00:00Z',
      },
      error: null,
    })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'documents') return { insert: mockInsert }
      if (table === 'elio_messages') return { select: mockSelectMetadata, update: mockUpdate }
      return {}
    })
  })

  it('Task 9.5 — retourne une erreur si paramètres manquants', async () => {
    const result = await saveGeneratedDocument('', 'Titre', 'Contenu')
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('Task 9.5 — insère dans documents avec source=elio_generated', async () => {
    await saveGeneratedDocument('client-1', 'Attestation de présence', 'Contenu doc')

    expect(mockFrom).toHaveBeenCalledWith('documents')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: 'client-1',
        source: 'elio_generated',
        title: 'Attestation de présence',
        content: 'Contenu doc',
      })
    )
  })

  it('Task 9.5 — retourne le document sauvegardé avec succès', async () => {
    const result = await saveGeneratedDocument('client-1', 'Attestation de présence', 'Contenu')
    expect(result.data).toBeTruthy()
    expect(result.error).toBeNull()
  })

  it('Task 9.5 — lie le document au message si messageId fourni (merge metadata)', async () => {
    await saveGeneratedDocument('client-1', 'Titre', 'Contenu', 'conv-1', 'msg-1')

    expect(mockFrom).toHaveBeenCalledWith('elio_messages')
    // Should merge with existing metadata, not overwrite
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          feedback: { rating: 'useful' },
          document_id: 'doc-123',
        }),
      })
    )
    expect(mockEq).toHaveBeenCalledWith('id', 'msg-1')
  })

  it('Task 9.5 — retourne DB_ERROR si insertion échoue', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } })

    const result = await saveGeneratedDocument('client-1', 'Titre', 'Contenu')
    expect(result.error?.code).toBe('DB_ERROR')
  })
})

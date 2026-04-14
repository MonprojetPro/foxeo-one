import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateDocument } from './generate-document'

const mockInvoke = vi.fn()
const mockFrom = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: mockFrom,
    functions: { invoke: mockInvoke },
  })),
}))

vi.mock('@monprojetpro/types', async (importOriginal) => {
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

describe('generateDocument (Story 8.9b — Task 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Task 9.3 — retourne une erreur si clientId manquant', async () => {
    const result = await generateDocument('', 'attestation_presence', {})
    expect(result.error).toBeTruthy()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('Task 9.3 — retourne une erreur pour un type inconnu', async () => {
    const result = await generateDocument('client-1', 'type_inconnu' as never, {})
    expect(result.error).toBeTruthy()
    expect(result.error?.code).toBe('INVALID_TYPE')
  })

  it('Task 9.3 — appelle elio-chat avec le prompt template construit', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { content: 'ATTESTATION DE PRÉSENCE\n...' },
      error: null,
    })

    const result = await generateDocument('client-1', 'attestation_presence', {
      beneficiary: 'Marie Dupont',
      period: 'janvier 2026',
    })

    expect(mockInvoke).toHaveBeenCalledWith(
      'elio-chat',
      expect.objectContaining({
        body: expect.objectContaining({
          systemPrompt: expect.stringContaining('documents professionnels'),
          message: expect.stringContaining('Marie Dupont'),
        }),
      })
    )
    expect(result.data).toContain('ATTESTATION')
    expect(result.error).toBeNull()
  })

  it('Task 9.3 — retourne LLM_ERROR si Edge Function échoue', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: new Error('Edge function error'),
    })

    const result = await generateDocument('client-1', 'recap_mensuel', { period: 'mars 2026' })
    expect(result.error?.code).toBe('LLM_ERROR')
  })

  it('Task 9.3 — retourne EMPTY_RESPONSE si le contenu est vide', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { content: '' },
      error: null,
    })

    const result = await generateDocument('client-1', 'export_data', { type: 'membres' })
    expect(result.error?.code).toBe('EMPTY_RESPONSE')
  })
})

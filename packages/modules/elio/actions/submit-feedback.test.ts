import { describe, it, expect, vi, beforeEach } from 'vitest'
import { submitFeedback } from './submit-feedback'

// ─── Mock Supabase ───────────────────────────────────────────
const mockSingle = vi.fn()
const mockEqForSelect = vi.fn(() => ({ single: mockSingle }))
const mockSelectFromMessages = vi.fn(() => ({ eq: mockEqForSelect }))

const mockEqForUpdate = vi.fn()
const mockUpdate = vi.fn(() => ({ eq: mockEqForUpdate }))

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: vi.fn(() => ({
      select: mockSelectFromMessages,
      update: mockUpdate,
    })),
  })),
}))
// ─────────────────────────────────────────────────────────────

describe('submitFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEqForUpdate.mockResolvedValue({ error: null })
  })

  it('retourne VALIDATION_ERROR si messageId est vide', async () => {
    const result = await submitFeedback('', 'useful')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('enregistre le feedback "useful" avec succès', async () => {
    mockSingle.mockResolvedValueOnce({ data: { metadata: {} }, error: null })
    mockEqForUpdate.mockResolvedValueOnce({ error: null })

    const result = await submitFeedback('msg-1', 'useful')
    expect(result.error).toBeNull()
    expect(result.data).toBe(true)
  })

  it('enregistre le feedback "not_useful" avec succès', async () => {
    mockSingle.mockResolvedValueOnce({ data: { metadata: {} }, error: null })
    mockEqForUpdate.mockResolvedValueOnce({ error: null })

    const result = await submitFeedback('msg-1', 'not_useful')
    expect(result.error).toBeNull()
    expect(result.data).toBe(true)
  })

  it('supprime le feedback quand rating est null (toggle off)', async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        metadata: {
          feedback: { rating: 'useful', created_at: '2026-03-02T10:00:00Z' },
        },
      },
      error: null,
    })
    mockEqForUpdate.mockResolvedValueOnce({ error: null })

    const result = await submitFeedback('msg-1', null)
    expect(result.error).toBeNull()
    expect(result.data).toBe(true)
  })

  it('retourne NOT_FOUND si le message n\'existe pas', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } })

    const result = await submitFeedback('msg-inexistant', 'useful')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('retourne DB_ERROR si la mise à jour échoue', async () => {
    mockSingle.mockResolvedValueOnce({ data: { metadata: {} }, error: null })
    mockEqForUpdate.mockResolvedValueOnce({ error: { message: 'DB error' } })

    const result = await submitFeedback('msg-1', 'useful')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })
})

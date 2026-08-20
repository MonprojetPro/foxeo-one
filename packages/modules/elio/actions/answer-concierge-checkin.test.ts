import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRpc = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({ rpc: mockRpc })),
}))

const MESSAGE_ID = '11111111-0000-4000-8000-000000000001'

describe('answerConciergeCheckin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects an empty message id without touching the DB', async () => {
    const { answerConciergeCheckin } = await import('./answer-concierge-checkin')
    const { data, error } = await answerConciergeCheckin('', 'ok')

    expect(data).toBeNull()
    expect(error?.code).toBe('VALIDATION_ERROR')
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('rejects an answer outside ok | not_ok', async () => {
    const { answerConciergeCheckin } = await import('./answer-concierge-checkin')
    // @ts-expect-error — on teste précisément la garde runtime contre une valeur hors contrat
    const { error } = await answerConciergeCheckin(MESSAGE_ID, 'maybe')

    expect(error?.code).toBe('VALIDATION_ERROR')
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('calls the answer_one_checkin RPC with the message id and the answer', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null })

    const { answerConciergeCheckin } = await import('./answer-concierge-checkin')
    const { data, error } = await answerConciergeCheckin(MESSAGE_ID, 'not_ok')

    expect(mockRpc).toHaveBeenCalledWith('answer_one_checkin', {
      p_message_id: MESSAGE_ID,
      p_answer: 'not_ok',
    })
    expect(data).toBe(true)
    expect(error).toBeNull()
  })

  it('returns data=false (not an error) when the RPC refuses the message', async () => {
    // Mot inexistant, déjà répondu, ou appartenant à un autre client : la RPC répond false
    // sans révéler la cause. Côté client ce n'est pas une erreur à afficher.
    mockRpc.mockResolvedValue({ data: false, error: null })

    const { answerConciergeCheckin } = await import('./answer-concierge-checkin')
    const { data, error } = await answerConciergeCheckin(MESSAGE_ID, 'ok')

    expect(data).toBe(false)
    expect(error).toBeNull()
  })

  it('returns a typed error (never throws) when the RPC fails', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'boom' } })

    const { answerConciergeCheckin } = await import('./answer-concierge-checkin')
    const { data, error } = await answerConciergeCheckin(MESSAGE_ID, 'ok')

    expect(data).toBeNull()
    expect(error?.code).toBe('DATABASE_ERROR')
  })
})

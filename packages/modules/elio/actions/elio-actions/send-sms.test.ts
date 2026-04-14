import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendSms } from './send-sms'

const mockInsert = vi.fn(async () => ({ error: null }))
const mockMaybeSingle = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: mockMaybeSingle,
        })),
      })),
      insert: mockInsert,
    })),
  })),
}))

describe('sendSms (Story 8.9a — Task 5.3 + Task 6)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Task 5.4 — retourne MODULE_NOT_ACTIVE si sms non activé', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { active_modules: ['adhesions', 'agenda'] },
      error: null,
    })

    const result = await sendSms('client-1', ['member-1'], 'Rappel : cotisation en retard')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('MODULE_NOT_ACTIVE')
  })

  it('Task 5.3 — retourne { data: { sent: N } } si module actif', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { active_modules: ['sms', 'adhesions'] },
      error: null,
    })

    const result = await sendSms('client-1', ['member-1', 'member-2'], 'Rappel cotisation')
    expect(result.error).toBeNull()
    expect(result.data?.sent).toBe(2)
  })

  it('Task 6.1 — loggue l\'action avec actor_type elio_one_plus', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { active_modules: ['sms'] },
      error: null,
    })

    await sendSms('client-1', ['member-1'], 'Rappel cotisation')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ actor_type: 'elio_one_plus' })
    )
  })

  it('Task 8.2 — retourne erreur si message vide', async () => {
    const result = await sendSms('client-1', ['member-1'], '')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('Task 8.2 — retourne erreur si aucun destinataire', async () => {
    const result = await sendSms('client-1', [], 'Rappel cotisation')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })
})

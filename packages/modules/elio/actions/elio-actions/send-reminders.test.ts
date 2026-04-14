import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendReminders } from './send-reminders'

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

describe('sendReminders (Story 8.9a — Task 5.1 + Task 6)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Task 5.4 — retourne MODULE_NOT_ACTIVE si adhesions non activé', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { active_modules: ['agenda', 'sms'] },
      error: null,
    })

    const result = await sendReminders('client-1', ['member-1', 'member-2'])
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('MODULE_NOT_ACTIVE')
  })

  it('Task 5.1 — retourne { data: { sent: N } } si module actif et envoi réussi', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { active_modules: ['adhesions', 'agenda'] },
      error: null,
    })

    const result = await sendReminders('client-1', ['member-1', 'member-2'])
    expect(result.error).toBeNull()
    expect(result.data?.sent).toBe(2)
  })

  it('Task 6.1 — loggue l\'action dans activity_logs avec actor_type elio_one_plus', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { active_modules: ['adhesions'] },
      error: null,
    })

    await sendReminders('client-1', ['member-1'])
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ actor_type: 'elio_one_plus' })
    )
  })

  it('Task 8.2 — retourne erreur si aucun membre fourni', async () => {
    const result = await sendReminders('client-1', [])
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })
})

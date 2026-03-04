import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createEvent } from './create-event'

const mockInsert = vi.fn(async () => ({ error: null }))
const mockMaybeSingle = vi.fn()

vi.mock('@foxeo/supabase', () => ({
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

describe('createEvent (Story 8.9a — Task 5.2 + Task 6)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Task 5.4 — retourne MODULE_NOT_ACTIVE si agenda non activé', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { active_modules: ['adhesions', 'sms'] },
      error: null,
    })

    const result = await createEvent('client-1', { title: 'Réunion annuelle', date: '2026-04-01' })
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('MODULE_NOT_ACTIVE')
  })

  it('Task 5.2 — retourne { data: { eventId } } si module actif', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { active_modules: ['agenda', 'adhesions'] },
      error: null,
    })

    const result = await createEvent('client-1', { title: 'Réunion annuelle', date: '2026-04-01' })
    expect(result.error).toBeNull()
    expect(result.data?.eventId).toBeTruthy()
  })

  it('Task 6.1 — loggue l\'action avec actor_type elio_one_plus', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { active_modules: ['agenda'] },
      error: null,
    })

    await createEvent('client-1', { title: 'Réunion', date: '2026-04-01' })
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ actor_type: 'elio_one_plus' })
    )
  })

  it('Task 8.2 — retourne erreur si title manquant', async () => {
    const result = await createEvent('client-1', { title: '', date: '2026-04-01' })
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })
})

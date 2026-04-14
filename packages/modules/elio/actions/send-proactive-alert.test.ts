import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendProactiveAlert } from './send-proactive-alert'
import type { ProactiveAlert } from '../types/elio.types'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockMaybeSingle = vi.fn()
const mockInsert = vi.fn()

const MOCK_FROM_MAP: Record<string, unknown> = {}

const mockFrom = vi.fn((table: string) => {
  if (table === 'elio_conversations') {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: mockMaybeSingle,
    }
  }
  if (table === 'elio_messages' || table === 'notifications') {
    return {
      insert: mockInsert,
    }
  }
  return MOCK_FROM_MAP[table] ?? {}
})

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: mockFrom,
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

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ALERT: ProactiveAlert = {
  id: 'unpaid_subscriptions',
  moduleId: 'adhesions',
  condition: "SELECT COUNT(*) AS count FROM memberships WHERE status='unpaid'",
  message: 'Vous avez {count} cotisations impayées depuis plus de 30 jours',
  frequency: 'weekly',
  lastTriggered: null,
  enabled: true,
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('sendProactiveAlert (Story 8.9c — Task 6)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockResolvedValue({ error: null })
  })

  // Task 9.2 — message Élio + notification
  it('Task 6.2 — insère un message Élio si conversation active trouvée', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: 'conv-123' }, error: null })

    await sendProactiveAlert('client-uuid', ALERT, { count: 5 })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        conversation_id: 'conv-123',
        role: 'assistant',
        content: expect.stringContaining('cotisations impayées'),
        metadata: expect.objectContaining({ proactive_alert: true, alert_id: 'unpaid_subscriptions' }),
      })
    )
  })

  it('Task 6.3 — insère une notification in-app', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockInsert.mockResolvedValue({ error: null })

    await sendProactiveAlert('client-uuid', ALERT, { count: 3 })

    // La notification doit être insérée
    const notifCall = mockInsert.mock.calls.find((call) => {
      const arg = call[0] as Record<string, unknown>
      return arg.type === 'alert'
    })
    expect(notifCall).toBeDefined()
    const notifArg = notifCall![0] as Record<string, unknown>
    expect(notifArg.title).toBe('Alerte Élio')
    expect(notifArg.user_id).toBe('client-uuid')
    expect(notifArg.link).toBe('/modules/adhesions')
  })

  it('Task 6.3 — formate le message avec les données', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockInsert.mockResolvedValue({ error: null })

    await sendProactiveAlert('client-uuid', ALERT, { count: 7 })

    const notifCall = mockInsert.mock.calls.find((call) => {
      const arg = call[0] as Record<string, unknown>
      return arg.type === 'alert'
    })
    expect((notifCall![0] as Record<string, unknown>).content).toBe(
      'Vous avez 7 cotisations impayées depuis plus de 30 jours'
    )
  })

  it('Task 6.2 — ne crée pas de message si aucune conversation active', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockInsert.mockResolvedValue({ error: null })

    await sendProactiveAlert('client-uuid', ALERT, { count: 2 })

    // Seule la notification doit être insérée (pas de message elio_messages)
    const elioMsgCall = mockInsert.mock.calls.find((call) => {
      const arg = call[0] as Record<string, unknown>
      return 'conversation_id' in arg
    })
    expect(elioMsgCall).toBeUndefined()
  })

  it('retourne VALIDATION_ERROR si clientId vide', async () => {
    const result = await sendProactiveAlert('', ALERT, {})
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne DB_ERROR si la notification échoue', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockInsert.mockResolvedValue({ error: new Error('DB error') })

    const result = await sendProactiveAlert('client-uuid', ALERT, { count: 1 })
    expect(result.error?.code).toBe('DB_ERROR')
  })

  it('retourne succès même sans conversation Élio active', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockInsert.mockResolvedValue({ error: null })

    const result = await sendProactiveAlert('client-uuid', ALERT, { count: 1 })
    expect(result.data).toBe(true)
    expect(result.error).toBeNull()
  })
})

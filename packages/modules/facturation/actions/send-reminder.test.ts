import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockUpdate = vi.fn()
const mockInsert = vi.fn()
const mockSingle = vi.fn()
const mockEq = vi.fn()
const mockIn = vi.fn()

const mockFrom = vi.fn((table: string) => {
  return {
    select: vi.fn().mockReturnThis(),
    update: vi.fn(() => ({ eq: mockEq })),
    insert: vi.fn(() => ({ select: vi.fn().mockReturnThis(), single: mockSingle, eq: mockEq })),
    eq: mockEq,
    in: mockIn,
    single: mockSingle,
  }
})

const mockSupabase = {
  auth: {
    getUser: vi.fn(async () => ({ data: { user: { id: 'op-auth-id' } }, error: null })),
  },
  from: mockFrom,
  rpc: vi.fn(async () => ({ data: true, error: null })),
}

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => mockSupabase),
}))

global.fetch = vi.fn()

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('sendReminder — validation', () => {
  it('retourne VALIDATION_ERROR si reminderId vide', async () => {
    const { sendReminder } = await import('./send-reminder')
    const result = await sendReminder({ reminderId: '', channel: 'email', body: 'Test' })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.error?.message).toContain('reminderId')
  })

  it('retourne VALIDATION_ERROR si canal invalide', async () => {
    const { sendReminder } = await import('./send-reminder')
    const result = await sendReminder({ reminderId: 'uuid-1', channel: 'fax' as 'email', body: 'Test' })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.error?.message).toContain('Canal')
  })

  it('retourne VALIDATION_ERROR si body vide', async () => {
    const { sendReminder } = await import('./send-reminder')
    const result = await sendReminder({ reminderId: 'uuid-1', channel: 'email', body: '   ' })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })
})

describe('sendReminder — canal email', () => {
  beforeEach(() => {
    vi.resetAllMocks()

    const reminder = {
      id: 'rem-1',
      client_id: 'client-1',
      invoice_number: 'F-2026-001',
      invoice_amount: 1500,
      status: 'pending',
      reminder_level: 1,
    }
    const client = { email: 'marie@example.com', name: 'Marie Dupont', auth_user_id: 'auth-client-1' }

    const fromImpl = (table: string) => {
      if (table === 'collection_reminders') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(async () => ({ data: reminder, error: null })),
          update: vi.fn(() => ({
            eq: vi.fn(async () => ({ error: null })),
          })),
        }
      }
      if (table === 'clients') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(async () => ({ data: client, error: null })),
        }
      }
      if (table === 'notifications') {
        return {
          insert: vi.fn(async () => ({ error: null })),
        }
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn(async () => ({ data: null, error: null })) }
    }

    mockSupabase.auth.getUser = vi.fn(async () => ({ data: { user: { id: 'op-auth-id' } }, error: null }))
    mockSupabase.from = vi.fn(fromImpl) as typeof mockSupabase.from
    mockSupabase.rpc = vi.fn(async () => ({ data: true, error: null }))

    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
    process.env.RESEND_API_KEY = 'resend-key'

    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'email-id' }),
    })
  })

  it('appelle Resend avec le bon canal email', async () => {
    const { sendReminder } = await import('./send-reminder')
    const result = await sendReminder({
      reminderId: 'rem-1',
      channel: 'email',
      body: 'Bonjour, votre facture est en attente.',
    })

    expect(result.error).toBeNull()
    expect(result.data?.sent).toBe(true)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('retourne erreur si Resend répond non-ok', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Invalid API key' }),
    })

    const { sendReminder } = await import('./send-reminder')
    const result = await sendReminder({
      reminderId: 'rem-1',
      channel: 'email',
      body: 'Test body',
    })

    expect(result.error?.code).toBe('EMAIL_ERROR')
  })
})

describe('sendReminder — canal chat', () => {
  beforeEach(() => {
    vi.resetAllMocks()

    const reminder = {
      id: 'rem-2',
      client_id: 'client-2',
      invoice_number: 'F-2026-002',
      invoice_amount: 800,
      status: 'pending',
      reminder_level: 2,
    }
    const client = { email: 'jean@example.com', name: 'Jean Martin', auth_user_id: 'auth-client-2' }

    const notifInsertMock = vi.fn(async () => ({ error: null }))
    const updateEqMock = vi.fn(async () => ({ error: null }))

    const fromImpl = (table: string) => {
      if (table === 'collection_reminders') {
        let callCount = 0
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(async () => {
            callCount++
            return callCount === 1 ? { data: reminder, error: null } : { data: null, error: null }
          }),
          update: vi.fn(() => ({ eq: updateEqMock })),
        }
      }
      if (table === 'clients') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(async () => ({ data: client, error: null })),
        }
      }
      if (table === 'notifications') {
        return { insert: notifInsertMock }
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn(async () => ({ data: null, error: null })) }
    }

    mockSupabase.auth.getUser = vi.fn(async () => ({ data: { user: { id: 'op-auth-id' } }, error: null }))
    mockSupabase.from = vi.fn(fromImpl) as typeof mockSupabase.from
    mockSupabase.rpc = vi.fn(async () => ({ data: true, error: null }))
  })

  it('insère une notification pour canal chat', async () => {
    const { sendReminder } = await import('./send-reminder')
    const result = await sendReminder({
      reminderId: 'rem-2',
      channel: 'chat',
      body: 'Votre facture reste impayée.',
    })

    expect(result.error).toBeNull()
    expect(result.data?.sent).toBe(true)
    const calls = (mockSupabase.from as ReturnType<typeof vi.fn>).mock.calls
    const notifCall = calls.find((c) => c[0] === 'notifications')
    expect(notifCall).toBeTruthy()
  })
})

describe('sendReminder — canal both', () => {
  beforeEach(() => {
    vi.resetAllMocks()

    const reminder = {
      id: 'rem-3',
      client_id: 'client-3',
      invoice_number: 'F-2026-003',
      invoice_amount: 2000,
      status: 'pending',
      reminder_level: 3,
    }
    const client = { email: 'paul@example.com', name: 'Paul Bernard', auth_user_id: 'auth-client-3' }

    const fromImpl = (table: string) => {
      if (table === 'collection_reminders') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(async () => ({ data: reminder, error: null })),
          update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
        }
      }
      if (table === 'clients') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(async () => ({ data: client, error: null })),
        }
      }
      if (table === 'notifications') {
        return { insert: vi.fn(async () => ({ error: null })) }
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn(async () => ({ data: null, error: null })) }
    }

    mockSupabase.auth.getUser = vi.fn(async () => ({ data: { user: { id: 'op-auth-id' } }, error: null }))
    mockSupabase.from = vi.fn(fromImpl) as typeof mockSupabase.from
    mockSupabase.rpc = vi.fn(async () => ({ data: true, error: null }))

    process.env.RESEND_API_KEY = 'resend-key'
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'email-id-both' }),
    })
  })

  it('envoie email ET notification pour canal both', async () => {
    const { sendReminder } = await import('./send-reminder')
    const result = await sendReminder({
      reminderId: 'rem-3',
      channel: 'both',
      body: 'Relance ferme mais respectueuse.',
    })

    expect(result.error).toBeNull()
    expect(result.data?.sent).toBe(true)
    // Email envoyé
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({ method: 'POST' })
    )
    // Notification insérée
    const fromCalls = (mockSupabase.from as ReturnType<typeof vi.fn>).mock.calls
    const notifCall = fromCalls.find((c) => c[0] === 'notifications')
    expect(notifCall).toBeTruthy()
  })
})

describe('sendReminder — mise à jour DB', () => {
  it('met à jour le statut à sent avec le bon canal et body', async () => {
    vi.resetAllMocks()

    const reminder = {
      id: 'rem-4',
      client_id: 'client-4',
      invoice_number: 'F-2026-004',
      invoice_amount: 600,
      status: 'pending',
      reminder_level: 1,
    }

    const updateMock = vi.fn().mockReturnThis()
    const updateEqMock = vi.fn(async () => ({ error: null }))

    const fromImpl = (table: string) => {
      if (table === 'collection_reminders') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(async () => ({ data: reminder, error: null })),
          update: vi.fn(() => ({ eq: updateEqMock })),
        }
      }
      if (table === 'clients') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(async () => ({ data: { email: 'test@test.com', name: 'Test', auth_user_id: null }, error: null })),
        }
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn(async () => ({ data: null, error: null })), insert: vi.fn(async () => ({ error: null })) }
    }

    mockSupabase.auth.getUser = vi.fn(async () => ({ data: { user: { id: 'op-auth-id' } }, error: null }))
    mockSupabase.from = vi.fn(fromImpl) as typeof mockSupabase.from
    mockSupabase.rpc = vi.fn(async () => ({ data: true, error: null }))

    process.env.RESEND_API_KEY = 'resend-key'
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'email-id' }),
    })

    const { sendReminder } = await import('./send-reminder')
    const result = await sendReminder({
      reminderId: 'rem-4',
      channel: 'email',
      body: 'Corps modifié par MiKL.',
    })

    expect(result.data?.sent).toBe(true)
  })
})

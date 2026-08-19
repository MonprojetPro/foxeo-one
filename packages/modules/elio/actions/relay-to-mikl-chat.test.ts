import { describe, it, expect, vi, beforeEach } from 'vitest'
import { relayToMiklChat } from './relay-to-mikl-chat'

const mockGetUser = vi.fn()
const mockClientSingle = vi.fn()
const mockMessagesInsert = vi.fn()
const mockOperatorSingle = vi.fn()
const mockNotificationsInsert = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn((table: string) => {
      if (table === 'clients') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({ single: mockClientSingle })),
            })),
          })),
        }
      }
      return {}
    }),
  })),
  createServiceRoleSupabaseClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'messages') return { insert: mockMessagesInsert }
      if (table === 'operators') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ single: mockOperatorSingle })),
          })),
        }
      }
      if (table === 'notifications') return { insert: mockNotificationsInsert }
      return {}
    }),
  })),
}))

const AUTHED_USER = { data: { user: { id: 'auth-user-1' } }, error: null }
const CLIENT_ROW = {
  data: { id: 'client-1', name: 'Alice Martin', operator_id: 'op-123' },
  error: null,
}

describe('relayToMiklChat — Élio One relaie au Chat MiKL', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue(AUTHED_USER)
    mockClientSingle.mockResolvedValue(CLIENT_ROW)
    mockMessagesInsert.mockResolvedValue({ error: null })
    mockOperatorSingle.mockResolvedValue({ data: { auth_user_id: 'op-auth-1' }, error: null })
    mockNotificationsInsert.mockResolvedValue({ error: null })
  })

  it('poste le message dans le chat avec le marqueur via_elio', async () => {
    const result = await relayToMiklChat('client-1', 'Le client est bloqué sur son lancement.')

    expect(result.error).toBeNull()
    expect(result.data).toBe(true)
    expect(mockMessagesInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: 'client-1',
        operator_id: 'op-123',
        sender_type: 'client',
        content: 'Le client est bloqué sur son lancement.',
        via_elio: true,
      }),
    )
  })

  it('notifie MiKL avec son auth_user_id, jamais operators.id', async () => {
    await relayToMiklChat('client-1', 'Le client est bloqué sur son lancement.')

    expect(mockNotificationsInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient_type: 'operator',
        recipient_id: 'op-auth-1',
        type: 'message',
        link: '/modules/chat/client-1',
      }),
    )
  })

  it('refuse un utilisateur non authentifié', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const result = await relayToMiklChat('client-1', 'Un point à transmettre.')

    expect(result.error?.code).toBe('UNAUTHORIZED')
    expect(mockMessagesInsert).not.toHaveBeenCalled()
  })

  it('refuse de relayer pour un autre client que le sien', async () => {
    mockClientSingle.mockResolvedValue({ data: null, error: { message: 'no rows' } })

    const result = await relayToMiklChat('client-autre', 'Un point à transmettre.')

    expect(result.error?.code).toBe('FORBIDDEN')
    expect(mockMessagesInsert).not.toHaveBeenCalled()
  })

  it('rejette un résumé vide sans toucher à la base', async () => {
    const result = await relayToMiklChat('client-1', '   ')

    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(mockMessagesInsert).not.toHaveBeenCalled()
  })

  it('échoue proprement si le message ne part pas', async () => {
    mockMessagesInsert.mockResolvedValue({ error: { message: 'insert failed' } })

    const result = await relayToMiklChat('client-1', 'Un point à transmettre.')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
    expect(mockNotificationsInsert).not.toHaveBeenCalled()
  })

  it('considère le relais réussi même si la notification échoue', async () => {
    // Le message est déjà visible dans le chat via Realtime : échouer ici afficherait
    // au client « je n'ai pas réussi » alors que MiKL a bel et bien reçu son message.
    mockNotificationsInsert.mockResolvedValue({ error: { message: 'notif failed' } })

    const result = await relayToMiklChat('client-1', 'Un point à transmettre.')

    expect(result.error).toBeNull()
    expect(result.data).toBe(true)
  })

  it('tronque un résumé trop long au plafond du chat', async () => {
    await relayToMiklChat('client-1', 'x'.repeat(5000))

    const inserted = mockMessagesInsert.mock.calls[0]?.[0] as { content: string }
    expect(inserted.content).toHaveLength(4000)
  })
})

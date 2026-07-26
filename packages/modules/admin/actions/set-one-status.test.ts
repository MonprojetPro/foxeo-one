import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setOneStatus } from './set-one-status'

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))
vi.mock('@monprojetpro/modules-notifications', () => ({
  createNotification: vi.fn().mockResolvedValue({ data: {}, error: null }),
}))
vi.mock('@monprojetpro/module-elio', () => ({
  generateOneConciergeWord: vi.fn().mockResolvedValue({ data: { body: 'ok', source: 'template' }, error: null }),
}))

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { createNotification } from '@monprojetpro/modules-notifications'
import { generateOneConciergeWord } from '@monprojetpro/module-elio'

const CLIENT_ID = 'c3d4e5f6-a7b8-9012-cdef-123456789012'
const OPERATOR_ID = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'
const CLIENT_AUTH_ID = 'd4e5f6a7-b8c9-0123-defa-234567890123'

function makeSupabaseMock(overrides: {
  getUser?: { data: { user: { id: string } | null } }
  operator?: { data: { id: string } | null }
  client?: { data: { id: string; name: string; auth_user_id: string | null } | null; error: null | { message: string } }
  updateResult?: { error: null | { message: string } }
} = {}) {
  const getUser = overrides.getUser ?? { data: { user: { id: 'user-1' } } }
  const operator = overrides.operator ?? { data: { id: OPERATOR_ID } }
  const client = overrides.client ?? {
    data: { id: CLIENT_ID, name: 'Client Test', auth_user_id: CLIENT_AUTH_ID },
    error: null,
  }
  const updateResult = overrides.updateResult ?? { error: null }

  const activityLogsInsert = vi.fn().mockResolvedValue({ error: null })
  const updateEq = vi.fn().mockResolvedValue(updateResult)
  const update = vi.fn().mockReturnValue({ eq: updateEq })

  const supabase = {
    auth: { getUser: vi.fn().mockResolvedValue(getUser) },
    from: vi.fn((table: string) => {
      if (table === 'operators') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(operator),
        }
      }
      if (table === 'clients') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(client),
        }
      }
      if (table === 'client_configs') {
        return { update }
      }
      if (table === 'activity_logs') {
        return { insert: activityLogsInsert }
      }
      return {}
    }),
  }

  return { supabase, activityLogsInsert, update, updateEq }
}

describe('setOneStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne VALIDATION_ERROR pour un clientId invalide', async () => {
    const result = await setOneStatus('pas-un-uuid', 'delivered')
    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.data).toBeNull()
  })

  it('retourne UNAUTHORIZED si non authentifié', async () => {
    const { supabase } = makeSupabaseMock({ getUser: { data: { user: null } } })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never)

    const result = await setOneStatus(CLIENT_ID, 'delivered')
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('retourne UNAUTHORIZED si l\'utilisateur n\'est pas opérateur (refus non-opérateur)', async () => {
    const { supabase } = makeSupabaseMock({ operator: { data: null } })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never)

    const result = await setOneStatus(CLIENT_ID, 'delivered')
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('retourne NOT_FOUND si le client n\'appartient pas à l\'opérateur', async () => {
    const { supabase } = makeSupabaseMock({ client: { data: null, error: { message: 'no rows' } } })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never)

    const result = await setOneStatus(CLIENT_ID, 'delivered')
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('bascule en chantier → livré : met à jour, journalise et notifie', async () => {
    const { supabase, activityLogsInsert, update, updateEq } = makeSupabaseMock()
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never)

    const result = await setOneStatus(CLIENT_ID, 'delivered')

    expect(result.error).toBeNull()
    expect(result.data?.oneStatus).toBe('delivered')
    expect(update).toHaveBeenCalledWith({ one_status: 'delivered' })
    expect(updateEq).toHaveBeenCalledWith('client_id', CLIENT_ID)

    expect(activityLogsInsert).toHaveBeenCalledWith(
      expect.objectContaining({ actor_type: 'operator', actor_id: OPERATOR_ID, action: 'one_delivered' })
    )

    // Convention notifications : recipient_id = auth_user_id (jamais clients.id), title NOT NULL
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientType: 'client',
        recipientId: CLIENT_AUTH_ID,
        type: 'tool_update',
        title: expect.any(String),
      })
    )
    expect(generateOneConciergeWord).toHaveBeenCalledWith(CLIENT_ID, { type: 'tool_delivered' })
  })

  it('bascule livré → en chantier : réversible dans l\'autre sens', async () => {
    const { supabase, update } = makeSupabaseMock()
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never)

    const result = await setOneStatus(CLIENT_ID, 'construction')

    expect(result.error).toBeNull()
    expect(result.data?.oneStatus).toBe('construction')
    expect(update).toHaveBeenCalledWith({ one_status: 'construction' })
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'tool_update', recipientId: CLIENT_AUTH_ID })
    )
    expect(generateOneConciergeWord).toHaveBeenCalledWith(CLIENT_ID, { type: 'tool_construction' })
  })

  it('retourne DATABASE_ERROR si l\'update échoue', async () => {
    const { supabase } = makeSupabaseMock({ updateResult: { error: { message: 'DB down' } } })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never)

    const result = await setOneStatus(CLIENT_ID, 'delivered')
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })

  it('n\'envoie pas de notification si le client n\'a pas d\'auth_user_id (best-effort)', async () => {
    const { supabase } = makeSupabaseMock({
      client: { data: { id: CLIENT_ID, name: 'Client Test', auth_user_id: null }, error: null },
    })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never)

    const result = await setOneStatus(CLIENT_ID, 'delivered')
    expect(result.error).toBeNull()
    expect(createNotification).not.toHaveBeenCalled()
  })
})

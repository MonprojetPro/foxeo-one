import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getOrCreateStepConversation } from './get-or-create-step-conversation'

const STEP_ID = '00000000-0000-0000-0000-000000000099'
const USER_ID = '00000000-0000-0000-0000-000000000001'
const CLIENT_ID = '00000000-0000-0000-0000-000000000002'
const CONV_ID = '00000000-0000-0000-0000-000000000003'

function makeMockSupabase({
  user = { id: USER_ID },
  authError = null,
  client = { id: CLIENT_ID },
  clientError = null,
  existing = null as { id: string } | null,
  selectError = null,
  step = { step_number: 3, title: 'Valider le concept' } as { step_number: number; title: string } | null,
  conversation = { id: CONV_ID } as { id: string } | null,
  insertError = null,
} = {}) {
  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: authError ? null : user },
        error: authError,
      }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'clients') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: clientError ? null : client, error: clientError }),
        }
      }
      if (table === 'elio_conversations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: existing, error: selectError }),
          insert: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: conversation, error: insertError }),
        }
      }
      if (table === 'parcours_steps') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: step }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
    }),
  }
  return supabase
}

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))
vi.mock('@monprojetpro/types', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/types')>()
  return actual
})

import { createServerSupabaseClient } from '@monprojetpro/supabase'

describe('getOrCreateStepConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne VALIDATION_ERROR si stepId est vide', async () => {
    const result = await getOrCreateStepConversation('')
    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.data).toBeNull()
  })

  it('retourne UNAUTHORIZED si auth échoue', async () => {
    const mock = makeMockSupabase({ authError: new Error('auth failed') })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mock as never)
    const result = await getOrCreateStepConversation(STEP_ID)
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('retourne NOT_FOUND si aucun client trouvé', async () => {
    const mock = makeMockSupabase({ client: null })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mock as never)
    const result = await getOrCreateStepConversation(STEP_ID)
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('retourne la conversation existante si elle existe déjà', async () => {
    const mock = makeMockSupabase({ existing: { id: CONV_ID } })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mock as never)
    const result = await getOrCreateStepConversation(STEP_ID)
    expect(result.data?.conversationId).toBe(CONV_ID)
    expect(result.data?.clientId).toBe(CLIENT_ID)
    expect(result.error).toBeNull()
  })

  it('crée une nouvelle conversation si aucune n\'existe', async () => {
    const mock = makeMockSupabase({ existing: null, conversation: { id: CONV_ID } })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mock as never)
    const result = await getOrCreateStepConversation(STEP_ID)
    expect(result.data?.conversationId).toBe(CONV_ID)
    expect(result.data?.clientId).toBe(CLIENT_ID)
    expect(result.error).toBeNull()
  })

  it('retourne DB_ERROR si l\'insertion échoue', async () => {
    const mock = makeMockSupabase({
      existing: null,
      conversation: null,
      insertError: { message: 'insert failed', code: '42P01' },
    })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mock as never)
    const result = await getOrCreateStepConversation(STEP_ID)
    expect(result.error?.code).toBe('DB_ERROR')
  })
})

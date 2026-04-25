import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActionResponse } from '@monprojetpro/types'
import type { Message } from '../types/chat.types'

const mockGetUser = vi.fn()

// Auth/lookup chain : supporte n'importe quel nombre de .eq() avant .single()
const mockAuthSingle = vi.fn()
const mockEqChain: Record<string, unknown> = {}
mockEqChain.eq = vi.fn(() => mockEqChain)
mockEqChain.single = mockAuthSingle
const mockAuthSelect = vi.fn(() => mockEqChain)

// Insert chain: from('messages').insert().select().single()
const mockInsertSingle = vi.fn()
const mockInsertSelect = vi.fn(() => ({ single: mockInsertSingle }))
const mockInsert = vi.fn(() => ({ select: mockInsertSelect }))

// Notification insert (fire-and-forget, no .select().single())
const mockNotifInsert = vi.fn().mockResolvedValue({ error: null })

const mockFrom = vi.fn((table: string) => {
  if (table === 'notifications') {
    return { insert: mockNotifInsert }
  }
  if (table === 'operators' || table === 'clients') {
    return { select: mockAuthSelect }
  }
  return { insert: mockInsert }
})

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}))

const VALID_INPUT = {
  clientId: '00000000-0000-0000-0000-000000000001',
  operatorId: '00000000-0000-0000-0000-000000000002',
  senderType: 'operator' as const,
  content: 'Hello from MiKL',
}

describe('sendMessage Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: auth OK, authorization OK
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null })
    mockAuthSingle.mockResolvedValue({ data: { id: VALID_INPUT.operatorId, auth_user_id: 'auth-uuid' }, error: null })
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } })

    const { sendMessage } = await import('./send-message')
    const result: ActionResponse<Message> = await sendMessage(VALID_INPUT)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR when content is empty', async () => {
    const { sendMessage } = await import('./send-message')
    const result = await sendMessage({ ...VALID_INPUT, content: '' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns VALIDATION_ERROR for invalid clientId', async () => {
    const { sendMessage } = await import('./send-message')
    const result = await sendMessage({ ...VALID_INPUT, clientId: 'not-a-uuid' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns FORBIDDEN when sender identity does not match auth user', async () => {
    mockAuthSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })

    const { sendMessage } = await import('./send-message')
    const result = await sendMessage(VALID_INPUT)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it('returns the created message in camelCase on success', async () => {
    const fixedDate = '2026-02-17T10:00:00.000Z'
    mockInsertSingle.mockResolvedValue({
      data: {
        id: '00000000-0000-0000-0000-000000000099',
        client_id: VALID_INPUT.clientId,
        operator_id: VALID_INPUT.operatorId,
        sender_type: 'operator',
        content: 'Hello from MiKL',
        read_at: null,
        created_at: fixedDate,
      },
      error: null,
    })

    const { sendMessage } = await import('./send-message')
    const result = await sendMessage(VALID_INPUT)

    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()
    expect(result.data?.content).toBe('Hello from MiKL')
    expect(result.data?.senderType).toBe('operator')
    expect(result.data?.clientId).toBe(VALID_INPUT.clientId)
    expect(result.data?.readAt).toBeNull()
    expect(result.data?.createdAt).toBe(fixedDate)
  })

  it('returns DB_ERROR when insert fails', async () => {
    mockInsertSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { sendMessage } = await import('./send-message')
    const result = await sendMessage({
      ...VALID_INPUT,
      senderType: 'client',
    })

    // For client senderType, auth checks clients table
    mockAuthSingle.mockResolvedValue({ data: { id: VALID_INPUT.clientId }, error: null })

    const result2 = await sendMessage({
      ...VALID_INPUT,
      senderType: 'client',
    })

    expect(result2.data).toBeNull()
    expect(result2.error?.code).toBe('DB_ERROR')
  })
})

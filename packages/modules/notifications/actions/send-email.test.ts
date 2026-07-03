import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSingle = vi.fn()
const mockInsert = vi.fn()
const mockFrom = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: mockFrom,
  })),
}))

const CLIENT_STUB = {
  id: 'client-uuid',
  auth_user_id: 'auth-user-uuid',
  name: 'Jean Dupont',
}

describe('sendGraduationEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()

    mockFrom.mockImplementation((table: string) => {
      if (table === 'clients') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ single: mockSingle })),
          })),
        }
      }
      if (table === 'notifications') {
        return { insert: mockInsert }
      }
      return {}
    })
    mockSingle.mockResolvedValue({ data: CLIENT_STUB, error: null })
    mockInsert.mockResolvedValue({ error: null })
  })

  it('retourne sent: true quand la notification graduation est créée', async () => {
    const { sendGraduationEmail } = await import('./send-email')
    const result = await sendGraduationEmail({ clientId: 'client-uuid' })
    expect(result.error).toBeNull()
    expect(result.data?.sent).toBe(true)
  })

  it('insère une notification type graduation adressée au auth_user_id (pas clients.id), avec title non vide', async () => {
    const { sendGraduationEmail } = await import('./send-email')
    await sendGraduationEmail({ clientId: 'client-uuid' })

    expect(mockInsert).toHaveBeenCalledTimes(1)
    const inserted = mockInsert.mock.calls[0][0]
    expect(inserted).toMatchObject({
      recipient_type: 'client',
      recipient_id: 'auth-user-uuid', // convention : auth_user_id, jamais clients.id
      type: 'graduation', // présent dans la liste CHECK de notifications.type
    })
    expect(typeof inserted.title).toBe('string')
    expect(inserted.title.length).toBeGreaterThan(0) // title NOT NULL
  })

  it("n'appelle PAS .select() après l'insert (RLS SELECT owner-only → 42501 sinon)", async () => {
    const { sendGraduationEmail } = await import('./send-email')
    await sendGraduationEmail({ clientId: 'client-uuid' })

    // insert() est awaité directement — pas de chaînage .select()
    const insertReturn = await mockInsert.mock.results[0].value
    expect(insertReturn).toEqual({ error: null })
  })

  it("retourne sent: false (non-bloquant) si l'insert de la notification échoue", async () => {
    mockInsert.mockResolvedValueOnce({ error: { message: 'RLS error', code: '42501' } })
    const { sendGraduationEmail } = await import('./send-email')
    const result = await sendGraduationEmail({ clientId: 'client-uuid' })
    // Non-bloquant : error=null, sent=false
    expect(result.error).toBeNull()
    expect(result.data?.sent).toBe(false)
  })

  it('retourne sent: false (non-bloquant) si le client n\'a pas de auth_user_id', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { ...CLIENT_STUB, auth_user_id: null },
      error: null,
    })
    const { sendGraduationEmail } = await import('./send-email')
    const result = await sendGraduationEmail({ clientId: 'client-uuid' })
    expect(result.error).toBeNull()
    expect(result.data?.sent).toBe(false)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('retourne VALIDATION_ERROR si clientId vide', async () => {
    const { sendGraduationEmail } = await import('./send-email')
    const result = await sendGraduationEmail({ clientId: '' })
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne NOT_FOUND si client introuvable', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: new Error('not found') })
    const { sendGraduationEmail } = await import('./send-email')
    const result = await sendGraduationEmail({ clientId: 'bad-id' })
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })
})

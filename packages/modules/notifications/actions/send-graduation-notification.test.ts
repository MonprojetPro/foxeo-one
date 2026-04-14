import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockClientSingle = vi.fn()
const mockOperatorSingle = vi.fn()
const mockFrom = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'operator-auth-id' } }, error: null })),
    },
    from: mockFrom,
  })),
}))

const mockCreateNotification = vi.fn()
vi.mock('./create-notification', () => ({
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
}))

describe('sendGraduationNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()

    // Setup: from('clients') → single() returns client
    // from('operators') → single() returns operator
    mockFrom.mockImplementation((table: string) => {
      if (table === 'clients') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ single: mockClientSingle })),
          })),
        }
      }
      if (table === 'operators') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ single: mockOperatorSingle })),
          })),
        }
      }
      return {}
    })

    mockClientSingle.mockResolvedValue({
      data: { auth_user_id: 'client-auth-123' },
      error: null,
    })
    mockOperatorSingle.mockResolvedValue({
      data: { auth_user_id: 'operator-auth-456' },
      error: null,
    })
    mockCreateNotification.mockResolvedValue({ data: { id: 'notif-1' }, error: null })
  })

  it('envoie notification client et opérateur avec succès', async () => {
    const { sendGraduationNotification } = await import('./send-graduation-notification')

    const result = await sendGraduationNotification({
      clientId: 'client-uuid',
      clientName: 'Jean Dupont',
      operatorId: 'operator-uuid',
      modulesCount: 3,
      tier: 'essentiel',
    })

    expect(result.error).toBeNull()
    expect(result.data?.clientNotified).toBe(true)
    expect(result.data?.operatorNotified).toBe(true)
    expect(mockCreateNotification).toHaveBeenCalledTimes(2)
  })

  it('notification client contient le bon titre et body avec modules', async () => {
    const { sendGraduationNotification } = await import('./send-graduation-notification')

    await sendGraduationNotification({
      clientId: 'client-uuid',
      clientName: 'Marie Martin',
      operatorId: 'operator-uuid',
      modulesCount: 5,
      tier: 'agentique',
    })

    const clientCall = mockCreateNotification.mock.calls[0][0]
    expect(clientCall.type).toBe('graduation')
    expect(clientCall.title).toContain('Félicitations')
    expect(clientCall.body).toContain('5 modules activés')
    expect(clientCall.link).toBe('/')
    expect(clientCall.recipientType).toBe('client')
  })

  it('notification opérateur contient le nom du client', async () => {
    const { sendGraduationNotification } = await import('./send-graduation-notification')

    await sendGraduationNotification({
      clientId: 'client-uuid',
      clientName: 'Jean Dupont',
      operatorId: 'operator-uuid',
      modulesCount: 2,
      tier: 'base',
    })

    const operatorCall = mockCreateNotification.mock.calls[1][0]
    expect(operatorCall.type).toBe('system')
    expect(operatorCall.title).toContain('Jean Dupont')
    expect(operatorCall.title).toContain('client One')
    expect(operatorCall.recipientType).toBe('operator')
    expect(operatorCall.link).toContain('client-uuid')
  })

  it('retourne VALIDATION_ERROR si clientId manquant', async () => {
    const { sendGraduationNotification } = await import('./send-graduation-notification')

    const result = await sendGraduationNotification({
      clientId: '',
      clientName: 'Test',
      operatorId: 'op-uuid',
      modulesCount: 1,
      tier: 'base',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne NOT_FOUND si client introuvable', async () => {
    mockClientSingle.mockResolvedValueOnce({ data: null, error: new Error('not found') })

    const { sendGraduationNotification } = await import('./send-graduation-notification')

    const result = await sendGraduationNotification({
      clientId: 'unknown-uuid',
      clientName: 'Test',
      operatorId: 'op-uuid',
      modulesCount: 1,
      tier: 'base',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('body avec 1 module utilise le singulier', async () => {
    const { sendGraduationNotification } = await import('./send-graduation-notification')

    await sendGraduationNotification({
      clientId: 'client-uuid',
      clientName: 'Test',
      operatorId: 'op-uuid',
      modulesCount: 1,
      tier: 'base',
    })

    const clientCall = mockCreateNotification.mock.calls[0][0]
    expect(clientCall.body).toContain('1 module activé')
    expect(clientCall.body).not.toContain('modules activés')
  })
})

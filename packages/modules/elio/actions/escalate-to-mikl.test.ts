import { describe, it, expect, vi, beforeEach } from 'vitest'
import { escalateToMiKL } from './escalate-to-mikl'

const mockSingle = vi.fn()
const mockInsert = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: vi.fn((table: string) => {
      // clients et operators sont tous deux lus en select().eq().single() :
      // les reponses sont donc empilees dans l'ordre sur mockSingle.
      if (table === 'clients' || table === 'operators') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: mockSingle,
            })),
          })),
        }
      }
      if (table === 'notifications') {
        return { insert: mockInsert }
      }
      return {}
    }),
  })),
}))

/**
 * Empile les deux lectures que fait l'action : la fiche client, puis l'operateur.
 * Le destinataire de la notification est l'auth_user_id de l'operateur, et non
 * son identifiant en table — une notification adressee a operators.id serait
 * silencieusement perdue.
 */
function mockClientThenOperator() {
  mockSingle.mockResolvedValueOnce({
    data: { operator_id: 'op-123', name: 'Alice Martin' },
    error: null,
  })
  mockSingle.mockResolvedValueOnce({
    data: { auth_user_id: 'auth-op-123' },
    error: null,
  })
}

describe('escalateToMiKL (Story 8.7 — Task 9)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Task 9.2 — crée une notification elio_escalation pour MiKL', async () => {
    mockClientThenOperator()
    mockInsert.mockResolvedValueOnce({ error: null })

    const result = await escalateToMiKL('client-1', 'Comment créer une facture ?', [])

    expect(result.data).toBe(true)
    expect(result.error).toBeNull()
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient_type: 'operator',
        recipient_id: 'auth-op-123',
        type: 'elio_escalation',
      })
    )
  })

  it('Task 9.3 — inclut la question dans la notification', async () => {
    mockClientThenOperator()
    mockInsert.mockResolvedValueOnce({ error: null })

    await escalateToMiKL('client-1', 'Comment créer une facture ?', [])

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining('Comment créer une facture ?'),
      })
    )
  })

  it('Task 9.3 — inclut le nom du client dans le titre', async () => {
    mockClientThenOperator()
    mockInsert.mockResolvedValueOnce({ error: null })

    await escalateToMiKL('client-1', 'Question test', [])

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('Alice Martin'),
      })
    )
  })

  it('Task 9.3 — inclut le lien vers la fiche client', async () => {
    mockClientThenOperator()
    mockInsert.mockResolvedValueOnce({ error: null })

    await escalateToMiKL('client-1', 'Question test', [])

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        link: expect.stringContaining('client-1'),
      })
    )
  })

  it('Task 9.3 — inclut l\'historique récent dans la notification', async () => {
    mockClientThenOperator()
    mockInsert.mockResolvedValueOnce({ error: null })

    await escalateToMiKL('client-1', 'Question test', ['Message 1', 'Message 2'])

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining('Message 1'),
      })
    )
  })

  it('retourne VALIDATION_ERROR si clientId manquant', async () => {
    const result = await escalateToMiKL('', 'Question test', [])
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne VALIDATION_ERROR si question vide', async () => {
    const result = await escalateToMiKL('client-1', '   ', [])
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne NOT_FOUND si client introuvable', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: new Error('not found') })

    const result = await escalateToMiKL('client-bad', 'Question test', [])
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('Task 9.4 — retourne DB_ERROR si l\'insertion notification échoue', async () => {
    mockClientThenOperator()
    mockInsert.mockResolvedValueOnce({ error: new Error('DB error') })

    const result = await escalateToMiKL('client-1', 'Question test', [])
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { submitEvolutionRequest } from './submit-evolution-request'

const mockSingle = vi.fn()
const mockInsertVR = vi.fn()
const mockInsertNotif = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: vi.fn((table: string) => {
      if (table === 'clients') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: mockSingle,
            })),
          })),
        }
      }
      if (table === 'validation_requests') {
        return { insert: mockInsertVR }
      }
      if (table === 'notifications') {
        return { insert: mockInsertNotif }
      }
      return {}
    }),
  })),
}))

describe('submitEvolutionRequest (Story 8.8 — Task 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Task 4.2 — crée une entrée dans validation_requests avec type=evolution_one', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { operator_id: 'op-1', name: 'Alice' },
      error: null,
    })
    mockInsertVR.mockResolvedValueOnce({ error: null })
    mockInsertNotif.mockResolvedValueOnce({ error: null })

    const result = await submitEvolutionRequest(
      'client-1',
      'Ajout SMS rappel',
      'Contenu du brief'
    )

    expect(result.data).toBe(true)
    expect(result.error).toBeNull()
    expect(mockInsertVR).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: 'client-1',
        operator_id: 'op-1',
        type: 'evolution_one',
        title: 'Ajout SMS rappel',
        status: 'pending',
      })
    )
  })

  it('Task 4.3 — crée une notification pour MiKL', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { operator_id: 'op-1', name: 'Alice' },
      error: null,
    })
    mockInsertVR.mockResolvedValueOnce({ error: null })
    mockInsertNotif.mockResolvedValueOnce({ error: null })

    await submitEvolutionRequest('client-1', 'Ajout SMS', 'Brief')

    expect(mockInsertNotif).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient_type: 'operator',
        recipient_id: 'op-1',
        type: 'validation',
        title: expect.stringContaining('Alice'),
      })
    )
  })

  it('Task 4.3 — la notification contient le titre de la demande', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { operator_id: 'op-1', name: 'Alice' },
      error: null,
    })
    mockInsertVR.mockResolvedValueOnce({ error: null })
    mockInsertNotif.mockResolvedValueOnce({ error: null })

    await submitEvolutionRequest('client-1', 'Export Excel', 'Brief contenu')

    expect(mockInsertNotif).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('Export Excel'),
      })
    )
  })

  it('retourne VALIDATION_ERROR si clientId manquant', async () => {
    const result = await submitEvolutionRequest('', 'titre', 'contenu')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne VALIDATION_ERROR si titre vide', async () => {
    const result = await submitEvolutionRequest('client-1', '  ', 'contenu')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne NOT_FOUND si client introuvable', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: new Error('not found') })

    const result = await submitEvolutionRequest('bad-id', 'titre', 'contenu')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('retourne DB_ERROR si l\'insertion validation_requests échoue', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { operator_id: 'op-1', name: 'Alice' },
      error: null,
    })
    mockInsertVR.mockResolvedValueOnce({ error: new Error('DB error') })

    const result = await submitEvolutionRequest('client-1', 'titre', 'contenu')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })

  it('Task 4.2 — inclut le contenu du brief dans la demande', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { operator_id: 'op-1', name: 'Alice' },
      error: null,
    })
    mockInsertVR.mockResolvedValueOnce({ error: null })
    mockInsertNotif.mockResolvedValueOnce({ error: null })

    await submitEvolutionRequest('client-1', 'titre', 'Contenu détaillé du brief')

    expect(mockInsertVR).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'Contenu détaillé du brief',
      })
    )
  })
})

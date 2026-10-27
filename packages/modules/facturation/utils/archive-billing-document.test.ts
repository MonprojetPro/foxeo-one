import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ============================================================
// T-063b — archiveBillingDocumentAsDocument
//
// Verifie : (1) le PDF est repris depuis public_file_url (devis) / file_url
// (facture) tel que renvoye par Pennylane, sans endpoint supplementaire ;
// (2) une relecture retente tant que le PDF n'est pas pret ; (3) rien n'est
// jamais leve — le best-effort est reel, pas juste suppose.
// ============================================================

vi.mock('../config/pennylane', () => ({
  pennylaneClient: { get: vi.fn() },
}))

import { pennylaneClient } from '../config/pennylane'
import { archiveBillingDocumentAsDocument } from './archive-billing-document'

const mockGet = vi.mocked(pennylaneClient.get)
const originalFetch = global.fetch

function makeSupabase() {
  const upload = vi.fn().mockResolvedValue({ error: null })
  const remove = vi.fn().mockResolvedValue({ error: null })
  const insert = vi.fn().mockResolvedValue({ error: null })
  return {
    storage: { from: vi.fn(() => ({ upload, remove })) },
    from: vi.fn(() => ({ insert })),
    __spies: { upload, remove, insert },
  }
}

describe('archiveBillingDocumentAsDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    }) as unknown as typeof fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('archive une facture via file_url, taggee Facturation/Facture', async () => {
    mockGet.mockResolvedValue({ data: { file_url: 'https://pennylane.com/f.pdf' }, error: null })
    const supabase = makeSupabase()

    await archiveBillingDocumentAsDocument({
      supabase: supabase as never,
      clientId: 'client-1',
      operatorId: 'operator-1',
      kind: 'invoice',
      pennylaneId: '9100',
      documentNumber: 'FA-2026-001',
    })

    expect(mockGet).toHaveBeenCalledWith('/customer_invoices/9100')
    expect(supabase.__spies.upload).toHaveBeenCalledTimes(1)
    const insertPayload = supabase.__spies.insert.mock.calls[0][0] as Record<string, unknown>
    expect(insertPayload.client_id).toBe('client-1')
    expect(insertPayload.operator_id).toBe('operator-1')
    expect(insertPayload.tags).toEqual(['Facturation', 'Facture'])
    expect(insertPayload.visibility).toBe('shared')
  })

  it('archive un devis via public_file_url, taggee Facturation/Devis', async () => {
    mockGet.mockResolvedValue({ data: { public_file_url: 'https://pennylane.com/q.pdf' }, error: null })
    const supabase = makeSupabase()

    await archiveBillingDocumentAsDocument({
      supabase: supabase as never,
      clientId: 'client-1',
      operatorId: 'operator-1',
      kind: 'quote',
      pennylaneId: '4807',
      documentNumber: 'DEV-001',
    })

    expect(mockGet).toHaveBeenCalledWith('/quotes/4807')
    const insertPayload = supabase.__spies.insert.mock.calls[0][0] as Record<string, unknown>
    expect(insertPayload.tags).toEqual(['Facturation', 'Devis'])
  })

  it('retente tant que le PDF n est pas pret, puis archive une fois dispo', async () => {
    mockGet
      .mockResolvedValueOnce({ data: { file_url: null }, error: null })
      .mockResolvedValueOnce({ data: { file_url: 'https://pennylane.com/f.pdf' }, error: null })
    const supabase = makeSupabase()

    vi.useFakeTimers()
    const promise = archiveBillingDocumentAsDocument({
      supabase: supabase as never,
      clientId: 'client-1',
      operatorId: 'operator-1',
      kind: 'invoice',
      pennylaneId: '9100',
      documentNumber: null,
    })
    await vi.runAllTimersAsync()
    await promise
    vi.useRealTimers()

    expect(mockGet).toHaveBeenCalledTimes(2)
    expect(supabase.__spies.upload).toHaveBeenCalledTimes(1)
  })

  it('abandonne proprement si le PDF ne devient jamais disponible — rien ne leve', async () => {
    mockGet.mockResolvedValue({ data: { file_url: null }, error: null })
    const supabase = makeSupabase()

    vi.useFakeTimers()
    const promise = archiveBillingDocumentAsDocument({
      supabase: supabase as never,
      clientId: 'client-1',
      operatorId: 'operator-1',
      kind: 'invoice',
      pennylaneId: '9100',
      documentNumber: null,
    })
    await vi.runAllTimersAsync()
    await expect(promise).resolves.toBeUndefined()
    vi.useRealTimers()

    expect(supabase.__spies.upload).not.toHaveBeenCalled()
  })

  it('une erreur Pennylane ne leve jamais', async () => {
    mockGet.mockRejectedValue(new Error('network down'))
    const supabase = makeSupabase()

    await expect(
      archiveBillingDocumentAsDocument({
        supabase: supabase as never,
        clientId: 'client-1',
        operatorId: 'operator-1',
        kind: 'invoice',
        pennylaneId: '9100',
        documentNumber: null,
      })
    ).resolves.toBeUndefined()
  })

  it('retire le fichier du storage si l insertion en base echoue', async () => {
    mockGet.mockResolvedValue({ data: { file_url: 'https://pennylane.com/f.pdf' }, error: null })
    const supabase = makeSupabase()
    supabase.__spies.insert.mockResolvedValueOnce({ error: { message: 'db down' } })

    await archiveBillingDocumentAsDocument({
      supabase: supabase as never,
      clientId: 'client-1',
      operatorId: 'operator-1',
      kind: 'invoice',
      pennylaneId: '9100',
      documentNumber: null,
    })

    expect(supabase.__spies.remove).toHaveBeenCalledTimes(1)
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Mock } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null })
const mockFrom = vi.fn()

const mockSupabase = {
  from: mockFrom,
}

vi.mock('./assert-operator', () => ({
  assertOperator: vi.fn(),
}))

vi.mock('../config/pennylane', () => ({
  pennylaneClient: {
    post: vi.fn(),
  },
}))

vi.mock('./trigger-billing-sync', () => ({
  triggerBillingSync: vi.fn().mockResolvedValue({ data: { synced: 1 }, error: null }),
}))

import { assertOperator } from './assert-operator'
import { pennylaneClient } from '../config/pennylane'
import { createCreditNote } from './create-credit-note'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeEqChain(finalData: unknown, finalError: unknown = null) {
  const chain: Record<string, unknown> = {}
  chain.eq = vi.fn(() => chain)
  chain.single = vi.fn().mockResolvedValue({ data: finalData, error: finalError })
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: finalData, error: finalError })
  return chain
}

function mockOperator(supabase = mockSupabase) {
  ;(assertOperator as Mock).mockResolvedValue({
    supabase,
    userId: 'operator-uuid',
    error: null,
  })
}

function mockOperatorForbidden() {
  ;(assertOperator as Mock).mockResolvedValue({
    supabase: null,
    userId: null,
    error: { message: 'Accès réservé aux opérateurs', code: 'FORBIDDEN' },
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('createCreditNote', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      insert: mockInsert,
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })
  })

  it('retourne FORBIDDEN si non opérateur', async () => {
    mockOperatorForbidden()
    const result = await createCreditNote('uuid-invoice', 100, 'remboursement')
    expect(result.error?.code).toBe('FORBIDDEN')
    expect(result.data).toBeNull()
  })

  it('retourne VALIDATION_ERROR si invoiceId invalide (non-UUID)', async () => {
    mockOperator()
    const result = await createCreditNote('not-a-uuid', 100, 'remboursement')
    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.data).toBeNull()
  })

  it('retourne VALIDATION_ERROR si amount <= 0', async () => {
    mockOperator()
    const result = await createCreditNote('550e8400-e29b-41d4-a716-446655440000', 0, 'remboursement')
    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.data).toBeNull()
  })

  it('retourne VALIDATION_ERROR si reason vide', async () => {
    mockOperator()
    const result = await createCreditNote('550e8400-e29b-41d4-a716-446655440000', 100, '')
    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.data).toBeNull()
  })

  it('retourne INVOICE_NOT_FOUND si facture absente', async () => {
    mockOperator()
    const chain = makeEqChain(null, { code: 'PGRST116' })
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue(chain) })
    const result = await createCreditNote('550e8400-e29b-41d4-a716-446655440000', 100, 'remboursement')
    expect(result.error?.code).toBe('INVOICE_NOT_FOUND')
  })

  it('retourne AMOUNT_EXCEEDS_INVOICE si montant > facture (euros vs centimes)', async () => {
    mockOperator()
    // billing_sync.amount = 5000 centimes = 50€; amount param = 100€ → dépasse
    const invoiceChain = makeEqChain(
      { pennylane_id: 'pny-inv-1', client_id: 'client-uuid', amount: 5000 },
      null
    )
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue(invoiceChain) })
    const result = await createCreditNote('550e8400-e29b-41d4-a716-446655440000', 100, 'remboursement')
    expect(result.error?.code).toBe('AMOUNT_EXCEEDS_INVOICE')
  })

  it('crée l\'avoir et retourne l\'id si tout est valide', async () => {
    mockOperator()

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // billing_sync query — amount = 20000 centimes = 200€
        return {
          select: vi.fn().mockReturnValue(
            makeEqChain({ pennylane_id: 'pny-inv-1', client_id: 'client-uuid', amount: 20000 })
          ),
        }
      }
      if (callCount === 2) {
        // clients query
        return {
          select: vi.fn().mockReturnValue(
            makeEqChain({ pennylane_customer_id: 'pny-cust-1', auth_user_id: 'user-uuid', name: 'Test Client' })
          ),
        }
      }
      // notifications / activity_logs
      return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) }
    })

    ;(pennylaneClient.post as Mock).mockResolvedValue({
      data: { customer_invoice: { id: 'credit-note-id-123', invoice_number: 'AV-001', status: 'pending', amount: 100 } },
      error: null,
    })

    // amount = 100€ <= facture de 200€ → OK
    const result = await createCreditNote('550e8400-e29b-41d4-a716-446655440000', 100, 'Remboursement partiel')
    expect(result.data).toBe('credit-note-id-123')
    expect(result.error).toBeNull()
  })

  it('retourne l\'erreur Pennylane si la création échoue', async () => {
    mockOperator()

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue(
            makeEqChain({ pennylane_id: 'pny-inv-1', client_id: 'client-uuid', amount: 20000 })
          ),
        }
      }
      return {
        select: vi.fn().mockReturnValue(
          makeEqChain({ pennylane_customer_id: 'pny-cust-1', auth_user_id: 'user-uuid', name: 'Test' })
        ),
      }
    })

    ;(pennylaneClient.post as Mock).mockResolvedValue({
      data: null,
      error: { message: 'API Pennylane error', code: 'PENNYLANE_ERROR' },
    })

    const result = await createCreditNote('550e8400-e29b-41d4-a716-446655440000', 100, 'Remboursement')
    expect(result.error?.code).toBe('PENNYLANE_ERROR')
    expect(result.data).toBeNull()
  })

  it('retourne NO_PENNYLANE_ID si client sans compte Pennylane', async () => {
    mockOperator()

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue(
            makeEqChain({ pennylane_id: 'pny-inv-1', client_id: 'client-uuid', amount: 20000 })
          ),
        }
      }
      return {
        select: vi.fn().mockReturnValue(
          makeEqChain({ pennylane_customer_id: null, auth_user_id: 'user-uuid', name: 'Test' })
        ),
      }
    })

    const result = await createCreditNote('550e8400-e29b-41d4-a716-446655440000', 100, 'Remboursement')
    expect(result.error?.code).toBe('NO_PENNYLANE_ID')
  })
})

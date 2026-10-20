import { describe, it, expect, vi, beforeEach } from 'vitest'

const CLIENT_ID = '00000000-0000-0000-0000-000000000001'
const OPERATOR_ID = '00000000-0000-0000-0000-000000000002'

const mockGetUser = vi.fn()

const mockOperatorMaybeSingle = vi.fn()
const mockOperatorEq = vi.fn(() => ({ maybeSingle: mockOperatorMaybeSingle }))
const mockOperatorSelect = vi.fn(() => ({ eq: mockOperatorEq }))

// billable_items.select(...).eq(client).eq(status) se termine soit par
// .order() (getClientVisioDebt), soit par .in(ids) (invoiceVisioDebt) — le
// même point de chaîne porte donc les deux méthodes.
const mockDebtOrder = vi.fn()
const mockDebtIn = vi.fn()
const mockDebtEqStatus = vi.fn(() => ({ order: mockDebtOrder, in: mockDebtIn }))
const mockDebtEqClient = vi.fn(() => ({ eq: mockDebtEqStatus }))
const mockDebtSelect = vi.fn(() => ({ eq: mockDebtEqClient }))

// billable_items.update(...).in(ids).eq(status) — marquage 'invoiced'
const mockUpdateEqStatus = vi.fn(() => Promise.resolve({ error: null }))
const mockUpdateIn = vi.fn(() => ({ eq: mockUpdateEqStatus }))
const mockUpdate = vi.fn(() => ({ in: mockUpdateIn }))

const mockActivityLogsInsert = vi.fn().mockResolvedValue({ data: null, error: null })

const mockFrom = vi.fn((table: string) => {
  if (table === 'operators') return { select: mockOperatorSelect }
  if (table === 'billable_items') return { select: mockDebtSelect, update: mockUpdate }
  if (table === 'activity_logs') return { insert: mockActivityLogsInsert }
  return {}
})

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}))

const mockCreateInvoice = vi.fn()
vi.mock('@monprojetpro/modules-facturation', () => ({
  createInvoice: (clientId: string, lineItems: unknown, options: unknown) =>
    mockCreateInvoice(clientId, lineItems, options),
}))

describe('visio-billing actions (T-059)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-user-1' } }, error: null })
    mockOperatorMaybeSingle.mockResolvedValue({ data: { id: OPERATOR_ID }, error: null })
  })

  describe('getClientVisioDebt', () => {
    it('refuse un utilisateur non authentifié', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no session' } })

      const { getClientVisioDebt } = await import('./visio-billing')
      const result = await getClientVisioDebt(CLIENT_ID)

      expect(result.error?.code).toBe('UNAUTHORIZED')
    })

    it('refuse un compte sans fiche opérateur', async () => {
      mockOperatorMaybeSingle.mockResolvedValue({ data: null, error: null })

      const { getClientVisioDebt } = await import('./visio-billing')
      const result = await getClientVisioDebt(CLIENT_ID)

      expect(result.error?.code).toBe('FORBIDDEN')
    })

    it('retourne les items pending du client, mappés en camelCase', async () => {
      mockDebtOrder.mockResolvedValue({
        data: [
          { id: 'bi-1', label: 'Visio du 01/01 — Point', amount_cents: 4500, created_at: '2026-10-01T00:00:00Z', meeting_id: 'm-1' },
        ],
        error: null,
      })

      const { getClientVisioDebt } = await import('./visio-billing')
      const result = await getClientVisioDebt(CLIENT_ID)

      expect(result.error).toBeNull()
      expect(result.data).toEqual([
        { id: 'bi-1', label: 'Visio du 01/01 — Point', amountCents: 4500, createdAt: '2026-10-01T00:00:00Z', meetingId: 'm-1' },
      ])
      expect(mockDebtEqClient).toHaveBeenCalledWith('client_id', CLIENT_ID)
      expect(mockDebtEqStatus).toHaveBeenCalledWith('status', 'pending')
    })
  })

  describe('invoiceVisioDebt', () => {
    it('refuse une sélection vide', async () => {
      const { invoiceVisioDebt } = await import('./visio-billing')
      const result = await invoiceVisioDebt(CLIENT_ID, [])

      expect(result.error?.code).toBe('VALIDATION_ERROR')
      expect(mockCreateInvoice).not.toHaveBeenCalled()
    })

    it('refuse si les items ne sont plus pending (double-clic, déjà facturés)', async () => {
      mockDebtIn.mockResolvedValue({ data: [], error: null })

      const { invoiceVisioDebt } = await import('./visio-billing')
      const result = await invoiceVisioDebt(CLIENT_ID, ['bi-1'])

      expect(result.error?.code).toBe('NOT_FOUND')
      expect(mockCreateInvoice).not.toHaveBeenCalled()
    })

    it('crée une facture en BROUILLON (sendNow: false) et marque les items invoiced', async () => {
      mockDebtIn.mockResolvedValue({
        data: [
          { id: 'bi-1', label: 'Visio du 01/01', amount_cents: 4500 },
          { id: 'bi-2', label: 'Visio du 02/01', amount_cents: 3000 },
        ],
        error: null,
      })
      mockCreateInvoice.mockResolvedValue({
        data: { pennylaneInvoiceId: 'pl-999' },
        error: null,
      })

      const { invoiceVisioDebt } = await import('./visio-billing')
      const result = await invoiceVisioDebt(CLIENT_ID, ['bi-1', 'bi-2'])

      expect(result.error).toBeNull()
      expect(result.data).toEqual({ pennylaneInvoiceId: 'pl-999', invoicedCount: 2, totalCents: 7500 })

      // Brouillon — jamais d'envoi automatique, MiKL vérifie dans Facturation avant.
      expect(mockCreateInvoice).toHaveBeenCalledWith(
        CLIENT_ID,
        [
          expect.objectContaining({ label: 'Visio du 01/01', unitPrice: 45, total: 45 }),
          expect.objectContaining({ label: 'Visio du 02/01', unitPrice: 30, total: 30 }),
        ],
        { sendNow: false }
      )

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'invoiced', pennylane_invoice_id: 'pl-999' })
      )
      expect(mockUpdateIn).toHaveBeenCalledWith('id', ['bi-1', 'bi-2'])
      expect(mockUpdateEqStatus).toHaveBeenCalledWith('status', 'pending')
    })

    it('remonte l’erreur de createInvoice sans marquer les items', async () => {
      mockDebtIn.mockResolvedValue({
        data: [{ id: 'bi-1', label: 'Visio', amount_cents: 4500 }],
        error: null,
      })
      mockCreateInvoice.mockResolvedValue({
        data: null,
        error: { message: 'Pennylane KO', code: 'INVOICE_ERROR' },
      })

      const { invoiceVisioDebt } = await import('./visio-billing')
      const result = await invoiceVisioDebt(CLIENT_ID, ['bi-1'])

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe('INVOICE_ERROR')
      expect(mockUpdate).not.toHaveBeenCalled()
    })
  })
})

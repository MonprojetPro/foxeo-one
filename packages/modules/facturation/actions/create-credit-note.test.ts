import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================================
// T-041 — tests REECRITS le 2026-10-06.
//
// L'ancienne version validait une action ecrite en API V1 (wrapper
// `{ customer_invoice }`, `currency_amount`, `linked_to_invoice_number`) que
// le client HTTP n'appelle plus depuis des mois. Les mocks suivent desormais
// la forme V2 reelle : corps PLAT, `invoice_lines` a montants NEGATIFS,
// `credited_invoice_id` pour le rattachement — conformement au changelog
// Pennylane « Deprecation Credit Notes and Draft Invoices endpoints ».
// ============================================================

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

vi.mock('../config/pennylane', () => ({
  pennylaneClient: { get: vi.fn(), post: vi.fn() },
}))

vi.mock('./trigger-billing-sync', () => ({
  triggerBillingSync: vi.fn().mockResolvedValue({ data: null, error: null }),
}))

vi.mock('../utils/send-by-email-with-retry', () => ({
  sendByEmailWithRetry: vi.fn(),
}))

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { pennylaneClient } from '../config/pennylane'
import { sendByEmailWithRetry } from '../utils/send-by-email-with-retry'
import { createCreditNote } from './create-credit-note'

const mockCreateServerSupabaseClient = vi.mocked(createServerSupabaseClient)
const mockPennylane = vi.mocked(pennylaneClient)
const mockSendByEmail = vi.mocked(sendByEmailWithRetry)

const INVOICE_UUID = '11111111-1111-4111-8111-111111111111'

const ORIGINAL_LINES = [
  { label: 'Site vitrine QVCT', description: null, quantity: 1, unit: 'u', unitPrice: 3900, vatRate: 'FR_200', total: 3900 },
  { label: 'Maintenance', description: null, quantity: 1, unit: 'u', unitPrice: 1990, vatRate: 'FR_200', total: 1990 },
]

type MockOptions = {
  isOperator?: boolean
  invoiceRow?: Record<string, unknown> | null
  existingCreditNotes?: Array<Record<string, unknown>>
  pennylaneCustomerId?: string | null
}

function makeSupabaseMock(options: MockOptions = {}) {
  const {
    isOperator = true,
    invoiceRow = {
      pennylane_id: '31539123748864',
      client_id: 'client-1',
      amount: 589000,
      data: { invoice_number: 'F-2026-101', original_line_items: ORIGINAL_LINES },
    },
    existingCreditNotes = [],
    pennylaneCustomerId = '1558203228160',
  } = options

  const upsert = vi.fn().mockResolvedValue({ error: null })
  const insert = vi.fn().mockResolvedValue({ error: null })

  const select = vi.fn(() => {
    const table = currentTable

    if (table === 'billing_sync') {
      // Deux lectures distinctes sur la meme table :
      //   la facture      → .eq().eq().single()
      //   les avoirs      → .eq().eq()  (liste, pas de .single())
      const single = vi.fn().mockResolvedValue({
        data: invoiceRow,
        error: invoiceRow ? null : { message: 'not found' },
      })
      const secondEq = vi.fn(() => {
        const chain = { single } as Record<string, unknown>
        // La chaine « avoirs » est awaitee directement : on la rend thenable.
        ;(chain as { then?: unknown }).then = (resolve: (v: unknown) => void) =>
          resolve({ data: existingCreditNotes, error: null })
        return chain
      })
      return { eq: vi.fn(() => ({ eq: secondEq, single })) }
    }

    // clients → .eq().single()
    const single = vi.fn().mockResolvedValue({
      data: { pennylane_customer_id: pennylaneCustomerId, auth_user_id: 'auth-1', name: 'CSE HABITAT 77' },
      error: null,
    })
    return { eq: vi.fn(() => ({ single })) }
  })

  let currentTable = ''

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'operator-1' } }, error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: isOperator }),
    from: vi.fn((table: string) => {
      currentTable = table
      return { select, upsert, insert }
    }),
    __spies: { upsert, insert },
  }
}

function useSupabase(mock: ReturnType<typeof makeSupabaseMock>) {
  mockCreateServerSupabaseClient.mockResolvedValue(
    mock as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>
  )
}

function mockCreated(id = 77001, number = 'A-2026-001') {
  mockPennylane.post.mockResolvedValue({
    data: { id, invoice_number: number, status: 'credit_note' },
    error: null,
  })
}

function sentBody(call = 0) {
  return mockPennylane.post.mock.calls[call]?.[1] as Record<string, unknown>
}

describe('createCreditNote', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSendByEmail.mockResolvedValue({ sent: true, attempts: 1, lastError: null })
  })

  // ── Garde-fous ───────────────────────────────────────────────────────────

  it('refuse un utilisateur non operateur', async () => {
    useSupabase(makeSupabaseMock({ isOperator: false }))
    const result = await createCreditNote(INVOICE_UUID, { reason: 'Erreur' })
    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it('exige un motif', async () => {
    useSupabase(makeSupabaseMock())
    const result = await createCreditNote(INVOICE_UUID, { reason: '   ' })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(mockPennylane.post).not.toHaveBeenCalled()
  })

  it('remonte INVOICE_NOT_FOUND quand la facture est introuvable', async () => {
    useSupabase(makeSupabaseMock({ invoiceRow: null }))
    const result = await createCreditNote(INVOICE_UUID, { reason: 'Erreur' })
    expect(result.error?.code).toBe('INVOICE_NOT_FOUND')
    expect(mockPennylane.post).not.toHaveBeenCalled()
  })

  it('refuse de crediter deux fois la meme facture', async () => {
    useSupabase(
      makeSupabaseMock({
        existingCreditNotes: [
          { pennylane_id: 'A-99', data: { credited_invoice_pennylane_id: '31539123748864' } },
        ],
      })
    )
    const result = await createCreditNote(INVOICE_UUID, { reason: 'Encore une erreur' })

    expect(result.error?.code).toBe('ALREADY_CREDITED')
    expect(result.error?.message).toContain('A-99')
    expect(mockPennylane.post).not.toHaveBeenCalled()
  })

  it('refuse un avoir partiel superieur a la facture', async () => {
    useSupabase(makeSupabaseMock())
    const result = await createCreditNote(INVOICE_UUID, { reason: 'Trop', amount: 99999 })
    expect(result.error?.code).toBe('AMOUNT_EXCEEDS_INVOICE')
    expect(mockPennylane.post).not.toHaveBeenCalled()
  })

  it('refuse un avoir total quand les lignes d origine sont perdues', async () => {
    useSupabase(
      makeSupabaseMock({
        invoiceRow: {
          pennylane_id: '31539123748864',
          client_id: 'client-1',
          amount: 589000,
          data: { invoice_number: 'F-2026-101' },
        },
      })
    )
    const result = await createCreditNote(INVOICE_UUID, { reason: 'Erreur' })
    expect(result.error?.code).toBe('ORIGINAL_LINES_MISSING')
    expect(mockPennylane.post).not.toHaveBeenCalled()
  })

  // ── Avoir total ──────────────────────────────────────────────────────────

  it('inverse les lignes d origine et envoie un corps PLAT V2', async () => {
    useSupabase(makeSupabaseMock())
    mockCreated()

    const result = await createCreditNote(INVOICE_UUID, { reason: 'Facture remplacée' })

    expect(result.error).toBeNull()
    expect(result.data?.pennylaneCreditNoteId).toBe('77001')
    expect(result.data?.creditNoteNumber).toBe('A-2026-001')
    expect(result.data?.isFullCredit).toBe(true)
    expect(result.data?.amountHt).toBe(5890)

    const [path, body] = mockPennylane.post.mock.calls[0] as [string, Record<string, unknown>]
    expect(path).toBe('/customer_invoices')
    // Verrou anti-regression V1
    expect(body).not.toHaveProperty('customer_invoice')
    expect(body).not.toHaveProperty('currency_amount')
    expect(body).not.toHaveProperty('linked_to_invoice_number')
    expect(body.customer_id).toBe(1558203228160)
    expect(body.credited_invoice_id).toBe(31539123748864)

    const lines = body.invoice_lines as Record<string, unknown>[]
    expect(lines).toHaveLength(2)
    expect(lines[0].label).toBe('Site vitrine QVCT')
    expect(lines[0].raw_currency_unit_price).toBe('-3900.00')
    expect(lines[1].raw_currency_unit_price).toBe('-1990.00')
  })

  it("imprime la reference de la facture sur l'avoir", async () => {
    useSupabase(makeSupabaseMock())
    mockCreated()

    await createCreditNote(INVOICE_UUID, { reason: 'Facture remplacée' })

    expect(sentBody().pdf_invoice_free_text).toBe(
      'Avoir sur facture F-2026-101 — Facture remplacée'
    )
  })

  // ── Avoir partiel ────────────────────────────────────────────────────────

  it('emet une seule ligne negative pour un avoir partiel', async () => {
    useSupabase(makeSupabaseMock())
    mockCreated()

    const result = await createCreditNote(INVOICE_UUID, { reason: 'Geste', amount: 500 })

    expect(result.data?.isFullCredit).toBe(false)
    expect(result.data?.amountHt).toBe(500)

    const lines = sentBody().invoice_lines as Record<string, unknown>[]
    expect(lines).toHaveLength(1)
    expect(lines[0].label).toBe('Avoir sur facture F-2026-101')
    expect(lines[0].raw_currency_unit_price).toBe('-500.00')
    expect(lines[0].vat_rate).toBe('FR_200')
  })

  // ── Repli sur credited_invoice_id ────────────────────────────────────────

  it('reemet SANS credited_invoice_id si Pennylane le refuse en 422', async () => {
    useSupabase(makeSupabaseMock())
    mockPennylane.post
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'Unprocessable', code: 'PENNYLANE_422' },
      })
      .mockResolvedValueOnce({ data: { id: 77002, invoice_number: 'A-2026-002' }, error: null })

    const result = await createCreditNote(INVOICE_UUID, { reason: 'Erreur' })

    expect(result.error).toBeNull()
    expect(result.data?.linkedToInvoice).toBe(false)
    expect(mockPennylane.post).toHaveBeenCalledTimes(2)
    expect(sentBody(0)).toHaveProperty('credited_invoice_id')
    expect(sentBody(1)).not.toHaveProperty('credited_invoice_id')
    // Le second envoi porte les memes lignes : l'avoir reste complet
    expect((sentBody(1).invoice_lines as unknown[]).length).toBe(2)
  })

  // T-041a — le premier avoir reel a echoue en 400, et le repli n'ecoutait
  // que le 422 : il n'a pas joue. Les deux codes sont desormais couverts.
  it('reemet SANS credited_invoice_id si Pennylane le refuse en 400', async () => {
    useSupabase(makeSupabaseMock())
    mockPennylane.post
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'Bad Request', code: 'PENNYLANE_400' },
      })
      .mockResolvedValueOnce({ data: { id: 77003, invoice_number: 'A-2026-003' }, error: null })

    const result = await createCreditNote(INVOICE_UUID, { reason: 'Erreur' })

    expect(result.error).toBeNull()
    expect(result.data?.linkedToInvoice).toBe(false)
    expect(mockPennylane.post).toHaveBeenCalledTimes(2)
    expect(sentBody(1)).not.toHaveProperty('credited_invoice_id')
  })

  it("remonte l'erreur si le repli echoue AUSSI — pas de boucle", async () => {
    useSupabase(makeSupabaseMock())
    mockPennylane.post.mockResolvedValue({
      data: null,
      error: { message: 'Bad Request — ledger_account_id manquant', code: 'PENNYLANE_400' },
    })

    const result = await createCreditNote(INVOICE_UUID, { reason: 'Erreur' })

    expect(result.error?.code).toBe('PENNYLANE_400')
    // Exactement 2 tentatives : l'originale et le repli, jamais plus
    expect(mockPennylane.post).toHaveBeenCalledTimes(2)
    // Le motif reel de Pennylane arrive jusqu'a l'appelant
    expect(result.error?.message).toContain('ledger_account_id')
  })

  it("ne retente PAS sur une erreur qui n'est ni 400 ni 422", async () => {
    useSupabase(makeSupabaseMock())
    mockPennylane.post.mockResolvedValue({
      data: null,
      error: { message: 'Boom', code: 'PENNYLANE_500' },
    })

    const result = await createCreditNote(INVOICE_UUID, { reason: 'Erreur' })

    expect(result.error?.code).toBe('PENNYLANE_500')
    expect(mockPennylane.post).toHaveBeenCalledTimes(1)
  })

  // ── Traces ───────────────────────────────────────────────────────────────

  it('ecrit le miroir billing_sync en montant NEGATIF, rattache a la facture', async () => {
    const supabase = makeSupabaseMock()
    useSupabase(supabase)
    mockCreated()

    await createCreditNote(INVOICE_UUID, { reason: 'Facture remplacée' })

    expect(supabase.__spies.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        entity_type: 'credit_note',
        pennylane_id: '77001',
        client_id: 'client-1',
        amount: -589000,
        data: expect.objectContaining({
          credited_invoice_pennylane_id: '31539123748864',
          credited_invoice_number: 'F-2026-101',
          is_full_credit: true,
        }),
      }),
      { onConflict: 'entity_type,pennylane_id' }
    )
  })

  // T-041b — un miroir non ecrit neutralise la garde anti-double-avoir.
  // L'echec etait un simple console.warn : invisible, donc jamais corrige.
  it('rapporte mirrored=true quand le miroir est bien ecrit', async () => {
    useSupabase(makeSupabaseMock())
    mockCreated()

    const result = await createCreditNote(INVOICE_UUID, { reason: 'Erreur' })
    expect(result.data?.mirrored).toBe(true)
  })

  it("rapporte mirrored=false quand le miroir echoue, SANS faire echouer l'avoir", async () => {
    const supabase = makeSupabaseMock()
    supabase.__spies.upsert.mockResolvedValue({
      error: { message: 'violates check constraint "billing_sync_entity_type_check"' },
    })
    useSupabase(supabase)
    mockCreated()

    const result = await createCreditNote(INVOICE_UUID, { reason: 'Erreur' })

    // L'avoir EXISTE chez Pennylane : on ne peut pas le declarer en echec
    expect(result.error).toBeNull()
    expect(result.data?.pennylaneCreditNoteId).toBe('77001')
    // ... mais l'operateur doit savoir qu'il est invisible cote Hub
    expect(result.data?.mirrored).toBe(false)
  })

  it('notifie le client sur son auth_user_id', async () => {
    const supabase = makeSupabaseMock()
    useSupabase(supabase)
    mockCreated()

    await createCreditNote(INVOICE_UUID, { reason: 'Facture remplacée' })

    const notif = supabase.__spies.insert.mock.calls.find(
      ([p]) => (p as Record<string, unknown>).recipient_type === 'client'
    )
    expect(notif?.[0]).toMatchObject({ recipient_id: 'auth-1', type: 'payment' })
  })

  it("n'envoie l'avoir par email que si on le demande", async () => {
    useSupabase(makeSupabaseMock())
    mockCreated()

    const silent = await createCreditNote(INVOICE_UUID, { reason: 'Erreur' })
    expect(silent.data?.emailSent).toBe(false)
    expect(mockSendByEmail).not.toHaveBeenCalled()

    const sent = await createCreditNote(INVOICE_UUID, { reason: 'Erreur', sendNow: true })
    expect(sent.data?.emailSent).toBe(true)
    expect(mockSendByEmail).toHaveBeenCalledWith('77001', 'customer_invoices')
  })
})

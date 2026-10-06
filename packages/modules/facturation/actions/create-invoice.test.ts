import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================================
// T-036 — createInvoice : facture directe, prestation deja effectuee.
//
// Les mocks suivent la forme V2 REELLE de l API Pennylane (corps plat,
// `invoice_lines`, `date`). Deux tests verrouillent ce qui a fait echouer la
// conversion : l absence de wrapper V1, et l auto-creation du compte Pennylane
// quand le client n en a pas encore — le cas exact du premier client reel.
// ============================================================

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

vi.mock('../config/pennylane', () => ({
  pennylaneClient: { get: vi.fn(), post: vi.fn() },
}))

vi.mock('./billing-proxy', () => ({
  createPennylaneCustomer: vi.fn(),
}))

vi.mock('./trigger-billing-sync', () => ({
  triggerBillingSync: vi.fn().mockResolvedValue({ data: null, error: null }),
}))

vi.mock('../utils/send-by-email-with-retry', () => ({
  sendByEmailWithRetry: vi.fn(),
}))

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { pennylaneClient } from '../config/pennylane'
import { createPennylaneCustomer } from './billing-proxy'
import { sendByEmailWithRetry } from '../utils/send-by-email-with-retry'
import { createInvoice } from './create-invoice'
import type { LineItem } from '../types/billing.types'

const mockCreateServerSupabaseClient = vi.mocked(createServerSupabaseClient)
const mockPennylane = vi.mocked(pennylaneClient)
const mockCreateCustomer = vi.mocked(createPennylaneCustomer)
const mockSendByEmail = vi.mocked(sendByEmailWithRetry)

// ── Helpers ───────────────────────────────────────────────────────────────────

type ClientRow = {
  id: string
  name: string
  company: string | null
  email: string | null
  auth_user_id: string | null
  pennylane_customer_id: string | null
}

const DEFAULT_CLIENT: ClientRow = {
  id: 'client-1',
  name: 'CSE HABITAT 77',
  company: 'CSE HABITAT 77',
  email: 'alex.rahli@habitat77.fr',
  auth_user_id: 'auth-user-1',
  pennylane_customer_id: '275890907',
}

function makeSupabaseMock(options: { isOperator?: boolean; client?: ClientRow | null } = {}) {
  const { isOperator = true, client = DEFAULT_CLIENT } = options

  const upsert = vi.fn().mockResolvedValue({ error: null })
  const insert = vi.fn().mockResolvedValue({ error: null })
  const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
  const single = vi.fn().mockResolvedValue({
    data: client,
    error: client ? null : { message: 'not found' },
  })
  const select = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single }) })

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'operator-1' } }, error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: isOperator }),
    from: vi.fn(() => ({ select, upsert, insert, update })),
    __spies: { upsert, insert, update },
  }
}

function useSupabase(mock: ReturnType<typeof makeSupabaseMock>) {
  mockCreateServerSupabaseClient.mockResolvedValue(
    mock as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>
  )
}

const LINES: LineItem[] = [
  {
    label: 'Audit et mise en place du CSE',
    description: 'Prestation réalisée en septembre 2026',
    quantity: 1,
    unit: 'u',
    unitPrice: 1500,
    vatRate: 'FR_200',
    total: 1500,
  },
]

function mockInvoiceCreated(id = 9100, invoiceNumber = 'FA-2026-001') {
  mockPennylane.post.mockResolvedValue({
    data: { id, invoice_number: invoiceNumber, status: 'pending', amount: '1800.00' },
    error: null,
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('createInvoice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSendByEmail.mockResolvedValue({ sent: true, attempts: 1, lastError: null })
  })

  it('refuse un utilisateur non authentifie', async () => {
    const supabase = makeSupabaseMock()
    supabase.auth.getUser = vi
      .fn()
      .mockResolvedValue({ data: { user: null }, error: new Error('Not authenticated') })
    useSupabase(supabase)

    const result = await createInvoice('client-1', LINES)
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('refuse un utilisateur non operateur', async () => {
    useSupabase(makeSupabaseMock({ isOperator: false }))

    const result = await createInvoice('client-1', LINES)
    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it('refuse une facture sans aucune ligne', async () => {
    useSupabase(makeSupabaseMock())

    const result = await createInvoice('client-1', [])
    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(mockPennylane.post).not.toHaveBeenCalled()
  })

  it('remonte CLIENT_NOT_FOUND quand la fiche client est introuvable', async () => {
    useSupabase(makeSupabaseMock({ client: null }))

    const result = await createInvoice('client-inconnu', LINES)
    expect(result.error?.code).toBe('CLIENT_NOT_FOUND')
    expect(mockPennylane.post).not.toHaveBeenCalled()
  })

  it('envoie un corps PLAT V2 : invoice_lines, date, customer_id entier', async () => {
    useSupabase(makeSupabaseMock())
    mockInvoiceCreated()

    const result = await createInvoice('client-1', LINES, { date: '2026-10-06', deadline: '2026-11-05' })

    expect(result.error).toBeNull()
    expect(result.data?.pennylaneInvoiceId).toBe('9100')
    expect(result.data?.invoiceNumber).toBe('FA-2026-001')
    expect(result.data?.totalHt).toBe(1500)

    const [path, body] = mockPennylane.post.mock.calls[0] as [string, Record<string, unknown>]
    expect(path).toBe('/customer_invoices')
    // Verrou anti-regression V1
    expect(body).not.toHaveProperty('customer_invoice')
    expect(body).not.toHaveProperty('line_items')
    expect(body.customer_id).toBe(275890907)
    expect(body.date).toBe('2026-10-06')
    expect(body.deadline).toBe('2026-11-05')
    expect((body.invoice_lines as Record<string, unknown>[])[0]).toMatchObject({
      label: 'Audit et mise en place du CSE',
      raw_currency_unit_price: '1500.00',
      vat_rate: 'FR_200',
    })
  })

  it('cree le compte Pennylane a la volee quand le client n en a pas', async () => {
    useSupabase(makeSupabaseMock({ client: { ...DEFAULT_CLIENT, pennylane_customer_id: null } }))
    mockCreateCustomer.mockResolvedValue({ data: '300111222', error: null })
    mockInvoiceCreated()

    const result = await createInvoice('client-1', LINES)

    expect(result.error).toBeNull()
    expect(mockCreateCustomer).toHaveBeenCalledWith(
      'client-1',
      'CSE HABITAT 77',
      'alex.rahli@habitat77.fr'
    )
    const [, body] = mockPennylane.post.mock.calls[0] as [string, Record<string, unknown>]
    expect(body.customer_id).toBe(300111222)
  })

  it('traite un pennylane_customer_id corrompu comme absent', async () => {
    useSupabase(makeSupabaseMock({ client: { ...DEFAULT_CLIENT, pennylane_customer_id: 'undefined' } }))
    mockCreateCustomer.mockResolvedValue({ data: '300111222', error: null })
    mockInvoiceCreated()

    const result = await createInvoice('client-1', LINES)

    expect(result.error).toBeNull()
    expect(mockCreateCustomer).toHaveBeenCalled()
  })

  it("remonte MISSING_EMAIL si le compte Pennylane manque et que le client n a pas d email", async () => {
    useSupabase(
      makeSupabaseMock({ client: { ...DEFAULT_CLIENT, pennylane_customer_id: null, email: null } })
    )

    const result = await createInvoice('client-1', LINES)

    expect(result.error?.code).toBe('MISSING_EMAIL')
    expect(mockCreateCustomer).not.toHaveBeenCalled()
    expect(mockPennylane.post).not.toHaveBeenCalled()
  })

  it("rejette une date d emission mal formee SANS lever d exception", async () => {
    useSupabase(makeSupabaseMock())

    // Avant la garde, toISOString() levait une RangeError — un throw dans une
    // Server Action, ce que le contrat { data, error } interdit.
    const result = await createInvoice('client-1', LINES, { date: '06/10/2026' })

    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(mockPennylane.post).not.toHaveBeenCalled()
  })

  it('rejette une date qui n existe pas au calendrier', async () => {
    useSupabase(makeSupabaseMock())

    const result = await createInvoice('client-1', LINES, { date: '2026-02-31' })

    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(mockPennylane.post).not.toHaveBeenCalled()
  })

  it("rejette une echeance anterieure a la date d emission", async () => {
    useSupabase(makeSupabaseMock())

    const result = await createInvoice('client-1', LINES, {
      date: '2026-10-06',
      deadline: '2026-10-01',
    })

    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(mockPennylane.post).not.toHaveBeenCalled()
  })

  it("calcule l echeance a +30 jours a partir de la date d emission fournie", async () => {
    useSupabase(makeSupabaseMock())
    mockInvoiceCreated()

    await createInvoice('client-1', LINES, { date: '2026-10-06' })

    const [, body] = mockPennylane.post.mock.calls[0] as [string, Record<string, unknown>]
    expect(body.deadline).toBe('2026-11-05')
  })

  it('accepte une reponse wrappee { customer_invoice: { id } }', async () => {
    useSupabase(makeSupabaseMock())
    mockPennylane.post.mockResolvedValue({
      data: { customer_invoice: { id: 9200, invoice_number: 'FA-2026-002' } },
      error: null,
    })

    const result = await createInvoice('client-1', LINES)

    expect(result.error).toBeNull()
    expect(result.data?.pennylaneInvoiceId).toBe('9200')
  })

  it("remonte INVALID_RESPONSE si l API ne rend aucun identifiant", async () => {
    useSupabase(makeSupabaseMock())
    mockPennylane.post.mockResolvedValue({ data: { invoice_number: 'FA-???' }, error: null })

    const result = await createInvoice('client-1', LINES)
    expect(result.error?.code).toBe('INVALID_RESPONSE')
  })

  it('remonte l erreur Pennylane et ne touche pas billing_sync', async () => {
    const supabase = makeSupabaseMock()
    useSupabase(supabase)
    mockPennylane.post.mockResolvedValue({
      data: null,
      error: { message: 'Unprocessable', code: 'PENNYLANE_422' },
    })

    const result = await createInvoice('client-1', LINES)

    expect(result.error?.code).toBe('PENNYLANE_422')
    expect(supabase.__spies.upsert).not.toHaveBeenCalled()
  })

  it('ecrit le miroir billing_sync avec le montant en centimes', async () => {
    const supabase = makeSupabaseMock()
    useSupabase(supabase)
    mockInvoiceCreated()

    await createInvoice('client-1', LINES)

    expect(supabase.__spies.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        entity_type: 'invoice',
        pennylane_id: '9100',
        client_id: 'client-1',
        amount: 180000,
      }),
      { onConflict: 'entity_type,pennylane_id' }
    )
  })

  it("rapporte emailSent=false quand l envoi echoue, sans faire echouer la facture", async () => {
    useSupabase(makeSupabaseMock())
    mockInvoiceCreated()
    mockSendByEmail.mockResolvedValue({
      sent: false,
      attempts: 5,
      lastError: { message: 'PDF not ready', code: 'PENNYLANE_409' },
    })

    const result = await createInvoice('client-1', LINES, { sendNow: true })

    expect(result.error).toBeNull()
    expect(result.data?.pennylaneInvoiceId).toBe('9100')
    expect(result.data?.emailSent).toBe(false)
  })

  it("n appelle pas l envoi email quand sendNow n est pas demande", async () => {
    useSupabase(makeSupabaseMock())
    mockInvoiceCreated()

    const result = await createInvoice('client-1', LINES)

    expect(result.data?.emailSent).toBe(false)
    expect(mockSendByEmail).not.toHaveBeenCalled()
  })

  it("envoie l email sur la ressource customer_invoices, pas quotes", async () => {
    useSupabase(makeSupabaseMock())
    mockInvoiceCreated()

    await createInvoice('client-1', LINES, { sendNow: true })

    expect(mockSendByEmail).toHaveBeenCalledWith('9100', 'customer_invoices')
  })

  // ── T-037 — gestes commerciaux ───────────────────────────────────────────

  it('pose une ligne de remise et garde le tarif catalogue visible', async () => {
    useSupabase(makeSupabaseMock())
    mockInvoiceCreated()

    const catalogue: LineItem[] = [
      { label: 'Site vitrine', description: null, quantity: 1, unit: 'u', unitPrice: 12390, vatRate: 'FR_200', total: 12390 },
    ]
    const result = await createInvoice('client-1', catalogue, { targetTotalHt: 399 })

    expect(result.error).toBeNull()
    expect(result.data?.catalogTotalHt).toBe(12390)
    expect(result.data?.totalHt).toBe(399)
    expect(result.data?.totalGrantedHt).toBe(11991)
    expect(result.data?.savingsPercentage).toBe(97)

    const [, body] = mockPennylane.post.mock.calls[0] as [string, Record<string, unknown>]
    const lines = body.invoice_lines as Record<string, unknown>[]
    expect(lines).toHaveLength(2)
    expect(lines[0].raw_currency_unit_price).toBe('12390.00')
    expect(lines[1].label).toBe('Geste commercial')
    expect(lines[1].raw_currency_unit_price).toBe('-11991.00')
  })

  it('utilise le libelle de geste personnalise', async () => {
    useSupabase(makeSupabaseMock())
    mockInvoiceCreated()

    await createInvoice('client-1', LINES, { targetTotalHt: 100, gestureLabel: 'Tarif pilote' })

    const [, body] = mockPennylane.post.mock.calls[0] as [string, Record<string, unknown>]
    const lines = body.invoice_lines as Record<string, unknown>[]
    expect(lines.at(-1)?.label).toBe('Tarif pilote')
  })

  it('pose une contre-ligne « Offert » sans effacer le prix catalogue', async () => {
    useSupabase(makeSupabaseMock())
    mockInvoiceCreated()

    const lines: LineItem[] = [
      { label: 'Dashboard', description: null, quantity: 1, unit: 'u', unitPrice: 2200, vatRate: 'FR_200', total: 2200, offered: true },
    ]
    const result = await createInvoice('client-1', lines)

    expect(result.error).toBeNull()
    expect(result.data?.totalHt).toBe(0)
    expect(result.data?.catalogTotalHt).toBe(2200)

    const [, body] = mockPennylane.post.mock.calls[0] as [string, Record<string, unknown>]
    const sent = body.invoice_lines as Record<string, unknown>[]
    expect(sent).toHaveLength(2)
    expect(sent[0].raw_currency_unit_price).toBe('2200.00')
    expect(sent[1].label).toBe('Offert — Dashboard')
    expect(sent[1].raw_currency_unit_price).toBe('-2200.00')
  })

  it('refuse un prix final superieur au total, sans rien envoyer', async () => {
    useSupabase(makeSupabaseMock())

    const result = await createInvoice('client-1', LINES, { targetTotalHt: 99999 })

    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(mockPennylane.post).not.toHaveBeenCalled()
  })

  it('refuse une remise globale sur des taux de TVA heterogenes', async () => {
    useSupabase(makeSupabaseMock())

    const mixed: LineItem[] = [
      { label: 'A', description: null, quantity: 1, unit: 'u', unitPrice: 1000, vatRate: 'FR_200', total: 1000 },
      { label: 'B', description: null, quantity: 1, unit: 'u', unitPrice: 500, vatRate: 'FR_100', total: 500 },
    ]
    const result = await createInvoice('client-1', mixed, { targetTotalHt: 100 })

    expect(result.error?.code).toBe('MIXED_VAT_RATES')
    expect(mockPennylane.post).not.toHaveBeenCalled()
  })

  it("ne laisse jamais le marqueur offered partir chez Pennylane", async () => {
    useSupabase(makeSupabaseMock())
    mockInvoiceCreated()

    const lines: LineItem[] = [
      { label: 'Dashboard', description: null, quantity: 1, unit: 'u', unitPrice: 2200, vatRate: 'FR_200', total: 2200, offered: true },
    ]
    await createInvoice('client-1', lines)

    const [, body] = mockPennylane.post.mock.calls[0] as [string, Record<string, unknown>]
    for (const sent of body.invoice_lines as Record<string, unknown>[]) {
      expect(sent).not.toHaveProperty('offered')
    }
  })

  it('notifie le client sur son auth_user_id, jamais sur clients.id', async () => {
    const supabase = makeSupabaseMock()
    useSupabase(supabase)
    mockInvoiceCreated()

    await createInvoice('client-1', LINES)

    const notifCall = supabase.__spies.insert.mock.calls.find(
      ([payload]) => (payload as Record<string, unknown>).recipient_type === 'client'
    )
    expect(notifCall).toBeDefined()
    const payload = notifCall?.[0] as Record<string, unknown>
    expect(payload.recipient_id).toBe('auth-user-1')
    expect(payload.recipient_id).not.toBe('client-1')
    expect(payload.type).toBe('payment')
    expect(payload.title).toBeTruthy()
  })

  it('ne notifie pas quand le client n a pas de compte de connexion', async () => {
    const supabase = makeSupabaseMock({ client: { ...DEFAULT_CLIENT, auth_user_id: null } })
    useSupabase(supabase)
    mockInvoiceCreated()

    await createInvoice('client-1', LINES)

    const notifCall = supabase.__spies.insert.mock.calls.find(
      ([payload]) => (payload as Record<string, unknown>).recipient_type === 'client'
    )
    expect(notifCall).toBeUndefined()
  })
})

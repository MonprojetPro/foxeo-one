import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================================
// T-044 — envoyer (ou renvoyer) une facture ou un avoir deja emis.
//
// Le defaut repare : l'envoi n'existait QU'A la creation. Une facture creee
// « sans envoyer » etait definitive ET injoignable depuis le Hub.
// ============================================================

vi.mock('@monprojetpro/supabase', () => ({ createServerSupabaseClient: vi.fn() }))

vi.mock('../utils/send-by-email-with-retry', () => ({ sendByEmailWithRetry: vi.fn() }))

vi.mock('./resolve-billing-recipients', () => ({
  resolveBillingRecipients: vi.fn(async () => ({
    data: { emails: ['compta@habitat77.fr'], attentionNames: [], usedFallback: false, pennylaneSynced: true },
    error: null,
  })),
}))

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { sendByEmailWithRetry } from '../utils/send-by-email-with-retry'
import { resolveBillingRecipients } from './resolve-billing-recipients'
import { sendInvoiceByEmail } from './send-invoice-by-email'

const mockCreateServerSupabaseClient = vi.mocked(createServerSupabaseClient)
const mockSend = vi.mocked(sendByEmailWithRetry)
const mockRecipients = vi.mocked(resolveBillingRecipients)

const PENNYLANE_ID = '31638262411264'

type Row = {
  entity_type: string
  client_id: string
  last_sent_at: string | null
  data: Record<string, unknown>
} | null

function makeSupabase(options: { isOperator?: boolean; row?: Row; updateError?: { message: string } | null } = {}) {
  const { isOperator = true, row = { entity_type: 'invoice', client_id: 'client-1', last_sent_at: null, data: {} }, updateError = null } =
    options

  const updateEq2 = vi.fn(async () => ({ error: updateError }))
  const update = vi.fn(() => ({ eq: vi.fn(() => ({ eq: updateEq2 })) }))
  const insert = vi.fn(async () => ({ error: null }))

  const from = vi.fn((table: string) => {
    if (table === 'billing_sync') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            in: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: row, error: null })) })),
          })),
        })),
        update,
      }
    }
    return { insert }
  })

  return {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'op-auth' } }, error: null })) },
    rpc: vi.fn(async () => ({ data: isOperator })),
    from,
    __spies: { update, insert },
  }
}

function use(mock: ReturnType<typeof makeSupabase>) {
  mockCreateServerSupabaseClient.mockResolvedValue(
    mock as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>
  )
}

describe('sendInvoiceByEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSend.mockResolvedValue({ sent: true, attempts: 1, lastError: null })
    mockRecipients.mockResolvedValue({
      data: { emails: ['compta@habitat77.fr'], attentionNames: [], usedFallback: false, pennylaneSynced: true },
      error: null,
    })
  })

  it('refuse un non-operateur', async () => {
    use(makeSupabase({ isOperator: false }))
    const result = await sendInvoiceByEmail(PENNYLANE_ID)
    expect(result.error?.code).toBe('FORBIDDEN')
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('exige un identifiant', async () => {
    use(makeSupabase())
    const result = await sendInvoiceByEmail('')
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('refuse un document inconnu du Hub, sans taper chez Pennylane a l aveugle', async () => {
    use(makeSupabase({ row: null }))
    const result = await sendInvoiceByEmail(PENNYLANE_ID)
    expect(result.error?.code).toBe('NOT_FOUND')
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('envoie, horodate et rend les adresses servies', async () => {
    const supabase = makeSupabase()
    use(supabase)

    const result = await sendInvoiceByEmail(PENNYLANE_ID)

    expect(result.error).toBeNull()
    expect(result.data?.sent).toBe(true)
    expect(result.data?.sentTo).toEqual(['compta@habitat77.fr'])
    expect(mockSend).toHaveBeenCalledWith(PENNYLANE_ID, 'customer_invoices')
    // ⚠️ La date va dans une COLONNE : le cron billing-sync reecrit `data` en
    // entier, une date posee dedans disparaitrait au prochain passage.
    expect(supabase.__spies.update).toHaveBeenCalledWith(
      expect.objectContaining({ last_sent_at: expect.any(String) })
    )
  })

  it('realigne les destinataires AVANT d envoyer — un renvoi doit suivre le carnet a jour', async () => {
    use(makeSupabase({ row: { entity_type: 'invoice', client_id: 'client-1', last_sent_at: '2026-10-07T10:00:00Z', data: {} } }))

    await sendInvoiceByEmail(PENNYLANE_ID)

    expect(mockRecipients).toHaveBeenCalledWith('client-1')
    const recipientsCallOrder = mockRecipients.mock.invocationCallOrder[0]
    const sendCallOrder = mockSend.mock.invocationCallOrder[0]
    expect(recipientsCallOrder).toBeLessThan(sendCallOrder)
  })

  it('marque le renvoi dans le journal quand le document etait deja parti', async () => {
    const supabase = makeSupabase({
      row: { entity_type: 'invoice', client_id: 'client-1', last_sent_at: '2026-10-07T10:00:00Z', data: {} },
    })
    use(supabase)

    await sendInvoiceByEmail(PENNYLANE_ID)

    expect(supabase.__spies.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'invoice_sent_by_email',
        metadata: expect.objectContaining({ was_resend: true }),
      })
    )
  })

  it('journalise un AVOIR sous sa propre action', async () => {
    const supabase = makeSupabase({
      row: { entity_type: 'credit_note', client_id: 'client-1', last_sent_at: null, data: {} },
    })
    use(supabase)

    await sendInvoiceByEmail(PENNYLANE_ID)

    expect(supabase.__spies.insert).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'credit_note_sent_by_email', entity_type: 'credit_note' })
    )
  })

  it('rend un message exploitable quand le PDF n est pas encore pret', async () => {
    use(makeSupabase())
    mockSend.mockResolvedValue({
      sent: false,
      attempts: 5,
      lastError: { message: 'PDF not ready', code: 'PENNYLANE_409' },
    })

    const result = await sendInvoiceByEmail(PENNYLANE_ID)

    expect(result.error?.code).toBe('PDF_NOT_READY')
    expect(result.error?.message).toContain('5 tentatives')
  })

  it('remonte l erreur Pennylane telle quelle sur un autre echec', async () => {
    use(makeSupabase())
    mockSend.mockResolvedValue({
      sent: false,
      attempts: 1,
      lastError: { message: 'Pennylane API error: 422', code: 'PENNYLANE_422' },
    })

    const result = await sendInvoiceByEmail(PENNYLANE_ID)

    expect(result.error?.code).toBe('PENNYLANE_422')
    expect(result.data).toBeNull()
  })

  // L'email EST parti : un echec d'horodatage ne doit pas etre rapporte comme un
  // echec d'envoi — sinon MiKL renvoie un document que le client a deja recu.
  it('reussit meme si l horodatage echoue, et le trace', async () => {
    const supabase = makeSupabase({ updateError: { message: 'permission denied' } })
    use(supabase)

    const result = await sendInvoiceByEmail(PENNYLANE_ID)

    expect(result.error).toBeNull()
    expect(result.data?.sent).toBe(true)
    expect(supabase.__spies.insert).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ stamped: false }) })
    )
  })

  it('signale le repli quand aucun contact ne recoit les factures', async () => {
    use(makeSupabase())
    mockRecipients.mockResolvedValue({
      data: { emails: ['login@habitat77.fr'], attentionNames: [], usedFallback: true, pennylaneSynced: false },
      error: null,
    })

    const result = await sendInvoiceByEmail(PENNYLANE_ID)

    expect(result.data?.usedFallbackRecipient).toBe(true)
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  dispatchPaidQuote,
  handleLabOnboardingPaid,
  handleOneDepositPaid,
  handleFinalPaymentPaid,
  type HandlerDeps,
} from './pennylane-paid-handlers'
import type { QuoteMetadataRow, QuoteType } from '../types/billing.types'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeQuote(overrides: Partial<QuoteMetadataRow> = {}): QuoteMetadataRow {
  return {
    pennylane_quote_id: 'PL-Q-100',
    pennylane_invoice_id: 'PL-INV-200',
    client_id: 'client-uuid-1',
    quote_type: 'lab_onboarding',
    total_amount_ht: 199,
    signed_at: null,
    paid_at: null,
    processed_at: null,
    created_at: '2026-04-14T10:00:00Z',
    updated_at: '2026-04-14T10:00:00Z',
    ...overrides,
  }
}

function makeClient(overrides: Record<string, unknown> = {}) {
  return {
    id: 'client-uuid-1',
    name: 'ACME SARL',
    email: 'acme@example.com',
    auth_user_id: null,
    ...overrides,
  }
}

// ── Mock supabase chain ───────────────────────────────────────────────────────

interface MockSupabaseOptions {
  client?: ReturnType<typeof makeClient> | null
  clientError?: unknown
  operators?: Array<{ auth_user_id: string }>
}

function makeMockSupabase(opts: MockSupabaseOptions = {}) {
  const clientSelectSingle = vi.fn().mockResolvedValue({
    data: opts.client === undefined ? makeClient() : opts.client,
    error: opts.clientError ?? null,
  })
  const clientsEq = vi.fn(() => ({ single: clientSelectSingle }))
  const clientsSelect = vi.fn(() => ({ eq: clientsEq }))

  const clientsUpdateEq = vi.fn().mockResolvedValue({ error: null })
  const clientsUpdate = vi.fn(() => ({ eq: clientsUpdateEq }))

  const configUpdateEq = vi.fn().mockResolvedValue({ error: null })
  const configUpdate = vi.fn(() => ({ eq: configUpdateEq }))

  const metadataUpdateEq = vi.fn().mockResolvedValue({ error: null })
  const metadataUpdate = vi.fn(() => ({ eq: metadataUpdateEq }))

  const operatorsSelect = vi.fn().mockResolvedValue({
    data: opts.operators ?? [{ auth_user_id: 'op-uuid-1' }],
    error: null,
  })

  const notificationsInsert = vi.fn().mockResolvedValue({ error: null })
  const activityLogsInsert = vi.fn().mockResolvedValue({ error: null })

  const from = vi.fn((table: string) => {
    switch (table) {
      case 'clients':
        return { select: clientsSelect, update: clientsUpdate }
      case 'client_configs':
        return { update: configUpdate }
      case 'quote_metadata':
        return { update: metadataUpdate }
      case 'operators':
        return { select: operatorsSelect }
      case 'notifications':
        return { insert: notificationsInsert }
      case 'activity_logs':
        return { insert: activityLogsInsert }
      default:
        throw new Error(`unexpected table: ${table}`)
    }
  })

  return {
    supabase: { from } as unknown as SupabaseClient,
    mocks: {
      clientSelectSingle,
      clientsUpdate,
      clientsUpdateEq,
      configUpdate,
      configUpdateEq,
      metadataUpdate,
      metadataUpdateEq,
      operatorsSelect,
      notificationsInsert,
      activityLogsInsert,
    },
  }
}

function makeDeps(
  supabase: SupabaseClient,
  overrides: Partial<HandlerDeps> = {}
): HandlerDeps {
  return {
    supabase,
    sendDirectEmail: vi.fn().mockResolvedValue({ success: true }),
    createAuthUser: vi.fn().mockResolvedValue({ userId: 'new-auth-uuid', error: null }),
    generatePassword: () => 'TEMP-PASSWORD-01',
    ...overrides,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('handleLabOnboardingPaid', () => {
  let mockSupabase: ReturnType<typeof makeMockSupabase>

  beforeEach(() => {
    mockSupabase = makeMockSupabase()
  })

  it('creates auth user + activates Lab config for new client', async () => {
    const deps = makeDeps(mockSupabase.supabase)
    const result = await handleLabOnboardingPaid(deps, makeQuote())

    expect(result.error).toBeNull()
    expect(result.data?.action).toBe('lab_activated')
    expect(deps.createAuthUser).toHaveBeenCalledWith({
      email: 'acme@example.com',
      password: 'TEMP-PASSWORD-01',
    })
    expect(mockSupabase.mocks.configUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        dashboard_type: 'lab',
        lab_mode_available: true,
        elio_lab_enabled: true,
      })
    )
    expect(deps.sendDirectEmail).toHaveBeenCalledWith(
      'welcome-lab',
      'acme@example.com',
      expect.objectContaining({ temporaryPassword: 'TEMP-PASSWORD-01' })
    )
  })

  it('is idempotent — noop if already processed', async () => {
    const deps = makeDeps(mockSupabase.supabase)
    const quote = makeQuote({ processed_at: '2026-04-14T11:00:00Z' })
    const result = await handleLabOnboardingPaid(deps, quote)

    expect(result.error).toBeNull()
    expect(result.data?.action).toBe('noop_already_processed')
    expect(deps.createAuthUser).not.toHaveBeenCalled()
    expect(deps.sendDirectEmail).not.toHaveBeenCalled()
  })

  it('reactivates Lab config without creating account if client already has auth_user_id', async () => {
    mockSupabase = makeMockSupabase({
      client: makeClient({ auth_user_id: 'existing-auth-uuid' }),
    })
    const deps = makeDeps(mockSupabase.supabase)
    const result = await handleLabOnboardingPaid(deps, makeQuote())

    expect(result.data?.action).toBe('lab_reactivated')
    expect(deps.createAuthUser).not.toHaveBeenCalled()
    expect(deps.sendDirectEmail).not.toHaveBeenCalled()
    expect(mockSupabase.mocks.configUpdate).toHaveBeenCalled()
  })

  it('returns CLIENT_NOT_FOUND if client missing', async () => {
    mockSupabase = makeMockSupabase({ client: null, clientError: { message: 'not found' } })
    const deps = makeDeps(mockSupabase.supabase)
    const result = await handleLabOnboardingPaid(deps, makeQuote())

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('CLIENT_NOT_FOUND')
  })

  it('returns AUTH_FAILED when createAuthUser fails', async () => {
    const deps = makeDeps(mockSupabase.supabase, {
      createAuthUser: vi.fn().mockResolvedValue({
        userId: null,
        error: { code: 'AUTH_ADMIN_CREATE_FAILED', message: 'boom' },
      }),
    })
    const result = await handleLabOnboardingPaid(deps, makeQuote())

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('AUTH_ADMIN_CREATE_FAILED')
    expect(deps.sendDirectEmail).not.toHaveBeenCalled()
  })

  it('continues and alerts MiKL when email sending fails', async () => {
    const deps = makeDeps(mockSupabase.supabase, {
      sendDirectEmail: vi.fn().mockResolvedValue({ success: false, error: 'SMTP down' }),
    })
    const result = await handleLabOnboardingPaid(deps, makeQuote())

    expect(result.error).toBeNull()
    expect(result.data?.action).toBe('lab_activated')
    // Deux notifications : l'alerte email KO + la notification "paiement reçu"
    expect(mockSupabase.mocks.notificationsInsert).toHaveBeenCalledTimes(2)
  })
})

describe('handleOneDepositPaid', () => {
  it('activates One dashboard + sets deposit_paid_at', async () => {
    const mockSupabase = makeMockSupabase()
    const deps = makeDeps(mockSupabase.supabase)
    const quote = makeQuote({
      quote_type: 'one_direct_deposit',
      pennylane_quote_id: 'PL-Q-200',
    })
    const result = await handleOneDepositPaid(deps, quote)

    expect(result.error).toBeNull()
    expect(result.data?.action).toBe('one_deposit_activated')
    expect(mockSupabase.mocks.configUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        dashboard_type: 'one',
        lab_mode_available: false,
        elio_lab_enabled: false,
        deposit_paid_at: expect.any(String),
      })
    )
    // clients.update pour password_change_required + project_status
    expect(mockSupabase.mocks.clientsUpdate).toHaveBeenCalledTimes(2)
  })

  it('skips account creation if auth_user_id already exists', async () => {
    const mockSupabase = makeMockSupabase({
      client: makeClient({ auth_user_id: 'existing-auth' }),
    })
    const deps = makeDeps(mockSupabase.supabase)
    const quote = makeQuote({ quote_type: 'ponctuel_deposit' })
    const result = await handleOneDepositPaid(deps, quote)

    expect(result.error).toBeNull()
    expect(deps.createAuthUser).not.toHaveBeenCalled()
  })

  it('is idempotent', async () => {
    const mockSupabase = makeMockSupabase()
    const deps = makeDeps(mockSupabase.supabase)
    const quote = makeQuote({
      quote_type: 'one_direct_deposit',
      processed_at: '2026-04-14T12:00:00Z',
    })
    const result = await handleOneDepositPaid(deps, quote)
    expect(result.data?.action).toBe('noop_already_processed')
    expect(deps.createAuthUser).not.toHaveBeenCalled()
  })
})

describe('handleFinalPaymentPaid', () => {
  it('marks project as completed and sets final_payment_at', async () => {
    const mockSupabase = makeMockSupabase({
      client: makeClient({ auth_user_id: 'existing-auth' }),
    })
    const deps = makeDeps(mockSupabase.supabase)
    const quote = makeQuote({ quote_type: 'one_direct_final' })
    const result = await handleFinalPaymentPaid(deps, quote)

    expect(result.error).toBeNull()
    expect(result.data?.action).toBe('final_payment_processed')
    expect(mockSupabase.mocks.configUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ final_payment_at: expect.any(String) })
    )
    expect(deps.sendDirectEmail).toHaveBeenCalledWith(
      'final-payment-confirmation',
      'acme@example.com',
      expect.any(Object)
    )
  })

  it('is idempotent', async () => {
    const mockSupabase = makeMockSupabase()
    const deps = makeDeps(mockSupabase.supabase)
    const quote = makeQuote({
      quote_type: 'ponctuel_final',
      processed_at: '2026-04-14T12:00:00Z',
    })
    const result = await handleFinalPaymentPaid(deps, quote)
    expect(result.data?.action).toBe('noop_already_processed')
    expect(mockSupabase.mocks.configUpdate).not.toHaveBeenCalled()
  })
})

describe('dispatchPaidQuote', () => {
  it.each<[QuoteType, string]>([
    ['lab_onboarding', 'lab_activated'],
    ['one_direct_deposit', 'one_deposit_activated'],
    ['ponctuel_deposit', 'one_deposit_activated'],
  ])('dispatches %s to the right handler', async (quoteType, expectedAction) => {
    const mockSupabase = makeMockSupabase()
    const deps = makeDeps(mockSupabase.supabase)
    const result = await dispatchPaidQuote(deps, makeQuote({ quote_type: quoteType }))
    expect(result.data?.action).toBe(expectedAction)
  })

  it.each<QuoteType>(['one_direct_final', 'ponctuel_final'])(
    'dispatches %s to final payment handler',
    async (quoteType) => {
      const mockSupabase = makeMockSupabase({
        client: makeClient({ auth_user_id: 'existing-auth' }),
      })
      const deps = makeDeps(mockSupabase.supabase)
      const result = await dispatchPaidQuote(deps, makeQuote({ quote_type: quoteType }))
      expect(result.data?.action).toBe('final_payment_processed')
    }
  )
})

import type { SupabaseClient } from '@supabase/supabase-js'
import type { QuoteMetadataRow, QuoteType } from '../types/billing.types'
import { createClientAuthUser } from '../utils/create-client-auth-user'
import { generateSecureTemporaryPassword } from '../utils/generate-temp-password'

// Story 13.4 — Handlers Pennylane webhook "facture payee"
//
// Tous les handlers :
//  - sont idempotents (check processed_at / paid_at en tete)
//  - retournent { data, error } jamais throw
//  - recoivent un SupabaseClient SERVICE_ROLE injecte par le webhook route
//  - notifient MiKL en in-app apres succes

const LAB_DEFAULT_MODULES = [
  'core-dashboard',
  'parcours',
  'documents',
  'chat',
  'elio',
  'visio',
]

const ONE_DEFAULT_MODULES = ['core-dashboard', 'chat', 'documents', 'elio']

export type HandlerResult =
  | { data: { action: string; clientId: string; tempPassword?: string }; error: null }
  | { data: null; error: { code: string; message: string; details?: unknown } }

export interface HandlerDeps {
  supabase: SupabaseClient
  sendDirectEmail: (
    template: 'welcome-lab' | 'welcome-one' | 'final-payment-confirmation',
    to: string,
    data: Record<string, unknown>
  ) => Promise<{ success: boolean; error?: string }>
  createAuthUser?: typeof createClientAuthUser
  generatePassword?: typeof generateSecureTemporaryPassword
}

async function notifyMiKL(
  supabase: SupabaseClient,
  title: string,
  body: string
): Promise<void> {
  const { data: operators } = await supabase
    .from('operators')
    .select('auth_user_id')

  if (!operators?.length) return

  const rows = operators
    .filter((op) => op.auth_user_id)
    .map((op) => ({
      type: 'payment',
      title,
      body,
      recipient_type: 'operator',
      recipient_id: op.auth_user_id,
      link: '/modules/facturation',
    }))

  if (rows.length > 0) {
    await supabase.from('notifications').insert(rows)
  }
}

async function markQuotePaid(
  supabase: SupabaseClient,
  pennylaneQuoteId: string
): Promise<void> {
  const now = new Date().toISOString()
  await supabase
    .from('quote_metadata')
    .update({ paid_at: now, processed_at: now })
    .eq('pennylane_quote_id', pennylaneQuoteId)
}

function isAlreadyProcessed(quote: QuoteMetadataRow): boolean {
  return quote.processed_at !== null
}

async function logActivity(
  supabase: SupabaseClient,
  action: string,
  clientId: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.from('activity_logs').insert({
    actor_type: 'system',
    actor_id: null,
    action,
    entity_type: 'quote',
    entity_id: clientId,
    metadata,
  })
  if (error) {
    console.warn(`[FACTURATION:${action}] activity_log insert failed:`, error)
  }
}

// ============================================================
// Helper common to lab + deposit : create auth user + temp password
// ============================================================

async function createAuthAndSetFlag(
  deps: HandlerDeps,
  client: { id: string; email: string }
): Promise<
  | { userId: string; tempPassword: string; error: null }
  | { userId: null; tempPassword: null; error: { code: string; message: string } }
> {
  const genPwd = deps.generatePassword ?? generateSecureTemporaryPassword
  const createUser = deps.createAuthUser ?? createClientAuthUser

  const tempPassword = genPwd()
  const authResult = await createUser({ email: client.email, password: tempPassword })

  if (authResult.error || !authResult.userId) {
    return {
      userId: null,
      tempPassword: null,
      error: authResult.error ?? { code: 'AUTH_FAILED', message: 'Compte non cree' },
    }
  }

  const { error: updateError } = await deps.supabase
    .from('clients')
    .update({
      auth_user_id: authResult.userId,
      password_change_required: true,
    })
    .eq('id', client.id)

  if (updateError) {
    return {
      userId: null,
      tempPassword: null,
      error: {
        code: 'CLIENT_UPDATE_FAILED',
        message: `clients.auth_user_id update failed: ${updateError.message}`,
      },
    }
  }

  return { userId: authResult.userId, tempPassword, error: null }
}

// ============================================================
// AC6 — lab_onboarding
// ============================================================

export async function handleLabOnboardingPaid(
  deps: HandlerDeps,
  quote: QuoteMetadataRow
): Promise<HandlerResult> {
  if (isAlreadyProcessed(quote)) {
    return { data: { action: 'noop_already_processed', clientId: quote.client_id }, error: null }
  }

  const { data: client, error: clientError } = await deps.supabase
    .from('clients')
    .select('id, name, email, auth_user_id')
    .eq('id', quote.client_id)
    .single()

  if (clientError || !client) {
    return {
      data: null,
      error: {
        code: 'CLIENT_NOT_FOUND',
        message: `Client ${quote.client_id} introuvable`,
        details: clientError,
      },
    }
  }

  if (client.auth_user_id) {
    // Compte existant : juste activer le Lab sur le config existant
    await deps.supabase
      .from('client_configs')
      .update({
        dashboard_type: 'lab',
        lab_mode_available: true,
        elio_lab_enabled: true,
        active_modules: LAB_DEFAULT_MODULES,
      })
      .eq('client_id', client.id)

    await markQuotePaid(deps.supabase, quote.pennylane_quote_id)
    await logActivity(deps.supabase, 'lab_access_activated', client.id, {
      pennylane_quote_id: quote.pennylane_quote_id,
      reused_existing_account: true,
    })
    await notifyMiKL(
      deps.supabase,
      `Paiement Lab reçu — ${client.name}`,
      `Accès Lab réactivé pour le client existant.`
    )
    return { data: { action: 'lab_reactivated', clientId: client.id }, error: null }
  }

  const authResult = await createAuthAndSetFlag(deps, {
    id: client.id,
    email: client.email as string,
  })
  if (authResult.error) return { data: null, error: authResult.error }

  const { error: configError } = await deps.supabase
    .from('client_configs')
    .update({
      dashboard_type: 'lab',
      lab_mode_available: true,
      elio_lab_enabled: true,
      active_modules: LAB_DEFAULT_MODULES,
    })
    .eq('client_id', client.id)

  if (configError) {
    return {
      data: null,
      error: {
        code: 'CLIENT_CONFIG_UPDATE_FAILED',
        message: configError.message,
        details: configError,
      },
    }
  }

  const emailResult = await deps.sendDirectEmail('welcome-lab', client.email as string, {
    clientName: (client.name as string) ?? 'Cher(e) client(e)',
    parcoursName: 'MonprojetPro Lab',
    activationLink: `${process.env.NEXT_PUBLIC_CLIENT_URL ?? 'https://app.monprojet-pro.com'}/login`,
    temporaryPassword: authResult.tempPassword,
  })

  if (!emailResult.success) {
    // Non-bloquant : compte cree, MiKL peut communiquer manuellement le mot de passe
    console.error('[FACTURATION:LAB_PAID] Email send failed:', emailResult.error)
    await notifyMiKL(
      deps.supabase,
      `⚠️ Email Lab non envoye — ${client.name}`,
      `Compte cree mais email d invitation en echec. Mot de passe temporaire a communiquer manuellement.`
    )
  }

  await markQuotePaid(deps.supabase, quote.pennylane_quote_id)
  await logActivity(deps.supabase, 'lab_access_activated', client.id, {
    pennylane_quote_id: quote.pennylane_quote_id,
    email_sent: emailResult.success,
  })
  await notifyMiKL(
    deps.supabase,
    `Paiement Lab reçu — ${client.name}`,
    `Compte cree et email envoye.`
  )

  return {
    data: {
      action: 'lab_activated',
      clientId: client.id,
      tempPassword: authResult.tempPassword,
    },
    error: null,
  }
}

// ============================================================
// AC7 — one_direct_deposit / ponctuel_deposit
// ============================================================

export async function handleOneDepositPaid(
  deps: HandlerDeps,
  quote: QuoteMetadataRow
): Promise<HandlerResult> {
  if (isAlreadyProcessed(quote)) {
    return { data: { action: 'noop_already_processed', clientId: quote.client_id }, error: null }
  }

  const { data: client, error: clientError } = await deps.supabase
    .from('clients')
    .select('id, name, email, auth_user_id')
    .eq('id', quote.client_id)
    .single()

  if (clientError || !client) {
    return {
      data: null,
      error: {
        code: 'CLIENT_NOT_FOUND',
        message: `Client ${quote.client_id} introuvable`,
        details: clientError,
      },
    }
  }

  let tempPassword: string | undefined
  let isReused = false

  if (client.auth_user_id) {
    isReused = true
  } else {
    const authResult = await createAuthAndSetFlag(deps, {
      id: client.id,
      email: client.email as string,
    })
    if (authResult.error) return { data: null, error: authResult.error }
    tempPassword = authResult.tempPassword
  }

  const nowIso = new Date().toISOString()
  const { error: configError } = await deps.supabase
    .from('client_configs')
    .update({
      dashboard_type: 'one',
      lab_mode_available: false,
      elio_lab_enabled: false,
      active_modules: ONE_DEFAULT_MODULES,
      deposit_paid_at: nowIso,
    })
    .eq('client_id', client.id)

  if (configError) {
    return {
      data: null,
      error: {
        code: 'CLIENT_CONFIG_UPDATE_FAILED',
        message: configError.message,
        details: configError,
      },
    }
  }

  await deps.supabase
    .from('clients')
    .update({ project_status: 'in_progress' })
    .eq('id', client.id)

  const emailResult = await deps.sendDirectEmail('welcome-one', client.email as string, {
    clientName: (client.name as string) ?? 'Cher(e) client(e)',
    activationLink: `${process.env.NEXT_PUBLIC_CLIENT_URL ?? 'https://app.monprojet-pro.com'}/login`,
    temporaryPassword: tempPassword ?? null,
  })

  if (!emailResult.success) {
    console.error('[FACTURATION:ONE_DEPOSIT_PAID] Email send failed:', emailResult.error)
    await notifyMiKL(
      deps.supabase,
      `⚠️ Email One non envoye — ${client.name}`,
      `Acompte recu, compte ${isReused ? 'reactive' : 'cree'} mais email d invitation en echec.`
    )
  }

  await markQuotePaid(deps.supabase, quote.pennylane_quote_id)
  await logActivity(deps.supabase, 'one_access_activated', client.id, {
    pennylane_quote_id: quote.pennylane_quote_id,
    reused_existing_account: isReused,
    email_sent: emailResult.success,
    quote_type: quote.quote_type,
  })
  await notifyMiKL(
    deps.supabase,
    `Acompte 30% reçu — ${client.name}`,
    `Compte One ${isReused ? 'reactive' : 'cree'} et email envoye.`
  )

  return {
    data: { action: 'one_deposit_activated', clientId: client.id, tempPassword },
    error: null,
  }
}

// ============================================================
// AC8 — one_direct_final / ponctuel_final
// ============================================================

export async function handleFinalPaymentPaid(
  deps: HandlerDeps,
  quote: QuoteMetadataRow
): Promise<HandlerResult> {
  if (isAlreadyProcessed(quote)) {
    return { data: { action: 'noop_already_processed', clientId: quote.client_id }, error: null }
  }

  const { data: client, error: clientError } = await deps.supabase
    .from('clients')
    .select('id, name, email, auth_user_id')
    .eq('id', quote.client_id)
    .single()

  if (clientError || !client) {
    return {
      data: null,
      error: {
        code: 'CLIENT_NOT_FOUND',
        message: `Client ${quote.client_id} introuvable`,
        details: clientError,
      },
    }
  }

  const nowIso = new Date().toISOString()

  const { error: configError } = await deps.supabase
    .from('client_configs')
    .update({ final_payment_at: nowIso })
    .eq('client_id', client.id)

  if (configError) {
    return {
      data: null,
      error: {
        code: 'CLIENT_CONFIG_UPDATE_FAILED',
        message: configError.message,
        details: configError,
      },
    }
  }

  await deps.supabase
    .from('clients')
    .update({ project_status: 'completed' })
    .eq('id', client.id)

  const emailResult = await deps.sendDirectEmail(
    'final-payment-confirmation',
    client.email as string,
    {
      clientName: (client.name as string) ?? 'Cher(e) client(e)',
    }
  )

  if (!emailResult.success) {
    console.error('[FACTURATION:FINAL_PAID] Email send failed:', emailResult.error)
  }

  await markQuotePaid(deps.supabase, quote.pennylane_quote_id)
  await logActivity(deps.supabase, 'final_payment_received', client.id, {
    pennylane_quote_id: quote.pennylane_quote_id,
    quote_type: quote.quote_type,
  })
  await notifyMiKL(
    deps.supabase,
    `Solde final reçu — ${client.name}`,
    `Projet marque comme complet.`
  )

  return { data: { action: 'final_payment_processed', clientId: client.id }, error: null }
}

// ============================================================
// Dispatcher
// ============================================================

export async function dispatchPaidQuote(
  deps: HandlerDeps,
  quote: QuoteMetadataRow
): Promise<HandlerResult> {
  const type: QuoteType = quote.quote_type
  switch (type) {
    case 'lab_onboarding':
      return handleLabOnboardingPaid(deps, quote)
    case 'one_direct_deposit':
    case 'ponctuel_deposit':
      return handleOneDepositPaid(deps, quote)
    case 'one_direct_final':
    case 'ponctuel_final':
      return handleFinalPaymentPaid(deps, quote)
    default: {
      // Exhaustiveness check — si un nouveau quote_type est ajoute sans handler
      const _exhaustive: never = type
      return {
        data: null,
        error: {
          code: 'UNKNOWN_QUOTE_TYPE',
          message: `quote_type non gere: ${String(_exhaustive)}`,
        },
      }
    }
  }
}

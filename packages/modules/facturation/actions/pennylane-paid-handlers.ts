import type { SupabaseClient } from '@supabase/supabase-js'
import { getClientAppUrl } from '@monprojetpro/utils'
import type { QuoteMetadataRow, QuoteType } from '../types/billing.types'
import { createClientAuthUser, generateSecureTemporaryPassword } from '@monprojetpro/supabase/admin'

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
    template: 'welcome-lab' | 'welcome-one' | 'welcome-venture' | 'final-payment-confirmation',
    to: string,
    data: Record<string, unknown>
  ) => Promise<{ success: boolean; error?: string }>
  createAuthUser?: typeof createClientAuthUser
  generatePassword?: typeof generateSecureTemporaryPassword
}

async function notifyMiKL(
  supabase: SupabaseClient,
  title: string,
  body: string,
  link = '/modules/facturation'
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
      link,
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

// Relie le paiement du devis Lab au statut Lab côté client : pose lab_paid (lu par
// getClientLabStatus / cockpit / déduction Lab -199€ sur un futur devis One).
async function markLabPaidOnClient(
  supabase: SupabaseClient,
  clientId: string,
  amountHt: number | null
): Promise<void> {
  const update: Record<string, unknown> = {
    lab_paid: true,
    lab_paid_at: new Date().toISOString(),
  }
  if (amountHt != null) update.lab_amount = amountHt
  const { error } = await supabase.from('clients').update(update).eq('id', clientId)
  if (error) console.warn('[FACTURATION:LAB_PAID] clients.lab_paid update failed:', error)
}

// 1er mail de bienvenue, envoyé AU PAIEMENT (chaleureux, annonce le 2e mail).
// Best-effort : n'échoue jamais le webhook.
async function sendVentureWelcome(
  deps: HandlerDeps,
  client: { name: string | null; email: string }
): Promise<void> {
  try {
    const res = await deps.sendDirectEmail('welcome-venture', client.email, {
      clientName: client.name ?? 'Cher(e) client(e)',
    })
    if (!res.success) console.warn('[FACTURATION:LAB_PAID] welcome-venture email failed:', res.error)
  } catch (err) {
    console.warn('[FACTURATION:LAB_PAID] welcome-venture email threw:', err)
  }
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
  client: { id: string; email: string },
  // Lab (LOT C) crée le compte mais le client définit son mot de passe via le lien
  // d'invitation envoyé au lancement du parcours → pas de changement forcé au login.
  // One conserve l'ancien flux (mot de passe temporaire communiqué) → true.
  requirePasswordChange = true
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
      password_change_required: requirePasswordChange,
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

    await markLabPaidOnClient(deps.supabase, client.id, quote.total_amount_ht)
    await markQuotePaid(deps.supabase, quote.pennylane_quote_id)
    await sendVentureWelcome(deps, { name: client.name as string | null, email: client.email as string })
    await logActivity(deps.supabase, 'lab_access_activated', client.id, {
      pennylane_quote_id: quote.pennylane_quote_id,
      reused_existing_account: true,
    })
    await notifyMiKL(
      deps.supabase,
      `Paiement Lab reçu — ${client.name}`,
      `Accès Lab réactivé. Configure (ou mets à jour) le parcours du client.`,
      `/modules/crm/clients/${client.id}`
    )
    return { data: { action: 'lab_reactivated', clientId: client.id }, error: null }
  }

  // LOT C — Le compte est créé, mais AUCUN email n'est envoyé au paiement.
  // L'email de bienvenue (avec lien « définis ton mot de passe ») part au LANCEMENT
  // du parcours, quand MiKL l'a assemblé. Donc pas de mot de passe forcé ici non plus.
  const authResult = await createAuthAndSetFlag(
    deps,
    { id: client.id, email: client.email as string },
    false
  )
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

  await markLabPaidOnClient(deps.supabase, client.id, quote.total_amount_ht)
  await markQuotePaid(deps.supabase, quote.pennylane_quote_id)
  await sendVentureWelcome(deps, { name: client.name as string | null, email: client.email as string })
  await logActivity(deps.supabase, 'lab_access_activated', client.id, {
    pennylane_quote_id: quote.pennylane_quote_id,
    parcours_pending: true,
  })
  await notifyMiKL(
    deps.supabase,
    `Paiement Lab reçu — ${client.name}`,
    `Compte créé, 1er mail de bienvenue envoyé. Configure le parcours : le mail d'accès partira au lancement.`,
    `/modules/crm/clients/${client.id}`
  )

  return {
    data: {
      action: 'lab_activated',
      clientId: client.id,
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
  // Ce handler traite les devis "one_direct_deposit" / "ponctuel_deposit" : un client qui
  // arrive directement sur le One, sans être passé par le Lab. L'intention d'origine était
  // de fermer le Lab pour ce client — mais lab_mode_available obéit à une règle de
  // permanence absolue (cf. toggle-access.ts) : une fois accordé, l'accès Lab ne doit
  // JAMAIS être retiré. Pour un client qui n'a jamais eu de Lab, la valeur est déjà `false`
  // par défaut : ne pas écrire la colonne préserve l'intention (« pas de Lab ici ») sans
  // jamais risquer d'écraser un Lab déjà accordé si ce flux est un jour déclenché sur un
  // client existant. La base (trigger BEFORE UPDATE) fait aussi office de filet de sécurité.
  const { error: configError } = await deps.supabase
    .from('client_configs')
    .update({
      dashboard_type: 'one',
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
    // Correctif 2026-07-25 — le fallback `app.monprojet-pro.com` n'existe pas en DNS.
    activationLink: `${getClientAppUrl()}/login`,
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

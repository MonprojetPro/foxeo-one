'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { createInvoice } from '@monprojetpro/modules-facturation'
import type { ActionResponse } from '@monprojetpro/types'
import { successResponse, errorResponse } from '@monprojetpro/types'

/**
 * Dette visio d'un client — T-059.
 *
 * Lit `billable_items` (status='pending'), toutes origines confondues :
 * `visio_session` (séance ponctuelle marquée payante depuis l'onglet Visio du
 * Hub) ET `coaching_session` (séance One+ hors forfait, créée automatiquement
 * par le webhook Cal.com). Même table, même écran — c'est la demande
 * explicite de MiKL : « il faut que l'on revoit cette fonction dans son
 * ensemble pour que tout soit cohérent », pas deux systèmes de dette parallèles.
 */
export interface VisioDebtItem {
  id: string
  label: string
  amountCents: number
  createdAt: string
  meetingId: string | null
}

async function assertHubOperator() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { supabase: null, error: errorResponse('Non authentifié', 'UNAUTHORIZED') }
  }
  // Opérateur identifié par auth_user_id, jamais par l'email (leçon du projet).
  const { data: operator, error: operatorError } = await supabase
    .from('operators')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (operatorError || !operator) {
    return { supabase: null, error: errorResponse('Compte opérateur requis', 'FORBIDDEN') }
  }
  return { supabase, error: null }
}

/**
 * Défaut gratuit/payant pour une nouvelle séance (T-059) : one_plus a des
 * séances de coaching incluses au forfait (gérées à part, webhook Cal.com) →
 * gratuit par défaut ici ; un client ponctuel n'a pas de forfait → payant.
 */
export async function getClientVisioBillingDefault(
  clientId: string
): Promise<ActionResponse<{ isFree: boolean }>> {
  if (!clientId) return errorResponse('ID client manquant', 'VALIDATION_ERROR')

  const { supabase, error: authError } = await assertHubOperator()
  if (authError || !supabase) return authError!

  const { data: config } = await supabase
    .from('client_configs')
    .select('elio_tier')
    .eq('client_id', clientId)
    .maybeSingle()

  return successResponse({ isFree: config?.elio_tier === 'one_plus' })
}

export async function getClientVisioDebt(
  clientId: string
): Promise<ActionResponse<VisioDebtItem[]>> {
  if (!clientId) return errorResponse('ID client manquant', 'VALIDATION_ERROR')

  const { supabase, error: authError } = await assertHubOperator()
  if (authError || !supabase) return authError!

  const { data, error } = await supabase
    .from('billable_items')
    .select('id, label, amount_cents, created_at, meeting_id')
    .eq('client_id', clientId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[HUB:VISIO_DEBT] query error:', error)
    return errorResponse('Erreur lors de la lecture de la dette', 'DB_ERROR', error)
  }

  return successResponse(
    (data ?? []).map((row) => ({
      id: row.id as string,
      label: row.label as string,
      amountCents: row.amount_cents as number,
      createdAt: row.created_at as string,
      meetingId: (row.meeting_id as string) ?? null,
    }))
  )
}

export interface InvoiceVisioDebtResult {
  pennylaneInvoiceId: string
  invoicedCount: number
  totalCents: number
}

/**
 * Facture la SÉLECTION de séances impayées choisie par MiKL (case à cocher —
 * décision T-059, pas un solde automatique de toute la dette).
 *
 * Crée la facture en BROUILLON (`sendNow: false`, même pattern que T-036/T-044)
 * pour que MiKL la vérifie dans le Hub avant envoi — l'envoi réel part ensuite
 * de l'écran factures via `sendInvoiceByEmail`, déjà existant.
 */
export async function invoiceVisioDebt(
  clientId: string,
  billableItemIds: string[]
): Promise<ActionResponse<InvoiceVisioDebtResult>> {
  if (!clientId) return errorResponse('ID client manquant', 'VALIDATION_ERROR')
  if (!billableItemIds || billableItemIds.length === 0) {
    return errorResponse('Aucune séance sélectionnée', 'VALIDATION_ERROR')
  }

  const { supabase, error: authError } = await assertHubOperator()
  if (authError || !supabase) return authError!

  // Re-lire les items en base (jamais faire confiance au montant envoyé par le
  // navigateur) — et vérifier qu'ils appartiennent bien à CE client et sont
  // toujours 'pending' (garde anti double-facturation en cas de double-clic).
  const { data: items, error: itemsError } = await supabase
    .from('billable_items')
    .select('id, label, amount_cents')
    .eq('client_id', clientId)
    .eq('status', 'pending')
    .in('id', billableItemIds)

  if (itemsError) {
    console.error('[HUB:INVOICE_VISIO_DEBT] query error:', itemsError)
    return errorResponse('Erreur lors de la lecture des séances', 'DB_ERROR', itemsError)
  }

  if (!items || items.length === 0) {
    return errorResponse(
      'Ces séances ne sont plus en attente (déjà facturées, ou dette introuvable)',
      'NOT_FOUND'
    )
  }

  const lineItems = items.map((item) => ({
    label: item.label as string,
    description: null,
    quantity: 1,
    unit: 'service',
    unitPrice: (item.amount_cents as number) / 100,
    vatRate: 'FR_200',
    total: (item.amount_cents as number) / 100,
  }))

  const invoiceRes = await createInvoice(clientId, lineItems, { sendNow: false })
  if (invoiceRes.error || !invoiceRes.data) {
    return errorResponse(
      invoiceRes.error?.message ?? 'Erreur lors de la création de la facture',
      invoiceRes.error?.code ?? 'INVOICE_ERROR'
    )
  }

  const pennylaneInvoiceId = invoiceRes.data.pennylaneInvoiceId
  const nowIso = new Date().toISOString()

  // Passer les items sélectionnés en 'invoiced' — garde .eq('status','pending')
  // pour ne jamais marquer un item qu'un autre appel aurait déjà traité entre-temps.
  const { error: updateError } = await supabase
    .from('billable_items')
    .update({ status: 'invoiced', pennylane_invoice_id: pennylaneInvoiceId, invoiced_at: nowIso })
    .in('id', items.map((i) => i.id))
    .eq('status', 'pending')

  if (updateError) {
    // Facture créée mais items non marqués → à corriger manuellement, tracé fort
    // (même traitement que monthly-billing.ts pour la même panne possible).
    console.error(
      '[HUB:INVOICE_VISIO_DEBT] Facture créée mais billable_items non passés en invoiced:',
      updateError
    )
    await supabase.from('activity_logs').insert({
      type: 'visio_debt_invoicing_error',
      metadata: { client_id: clientId, pennylane_invoice_id: pennylaneInvoiceId, item_ids: items.map((i) => i.id), error: updateError },
    })
  }

  const totalCents = items.reduce((sum, i) => sum + (i.amount_cents as number), 0)

  return successResponse({
    pennylaneInvoiceId,
    invoicedCount: items.length,
    totalCents,
  })
}

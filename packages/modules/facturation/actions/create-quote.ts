'use server'

import { pennylaneClient } from '../config/pennylane'
import { toPennylaneLineItem } from '../utils/billing-mappers'
import { triggerBillingSync } from './trigger-billing-sync'
import { assertOperator } from './assert-operator'
import type { ActionResponse } from '@monprojetpro/types'
import type { LineItem, PennylaneQuote, CreateQuoteOptions } from '../types/billing.types'

// ============================================================
// createAndSendQuote — crée un devis Pennylane pour un client
// ============================================================

export async function createAndSendQuote(
  clientId: string,
  lineItems: LineItem[],
  options: CreateQuoteOptions
): Promise<ActionResponse<string>> {
  const { supabase, userId, error: authError } = await assertOperator()
  if (authError || !supabase || !userId) return { data: null, error: authError }

  // Récupérer le client pour obtenir pennylane_customer_id et auth_user_id
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, name, company, email, auth_user_id, pennylane_customer_id, lab_paid')
    .eq('id', clientId)
    .single()

  if (clientError || !client) {
    return {
      data: null,
      error: { message: 'Client introuvable', code: 'CLIENT_NOT_FOUND', details: clientError },
    }
  }

  let pennylaneCustomerId = client.pennylane_customer_id as string | null

  // ID corrompu ('undefined', non-numérique) → re-création automatique
  if (pennylaneCustomerId && isNaN(parseInt(pennylaneCustomerId, 10))) {
    await supabase.from('clients').update({ pennylane_customer_id: null }).eq('id', clientId)
    pennylaneCustomerId = null
  }

  // Story G — Auto-créer le compte Pennylane si absent
  if (!pennylaneCustomerId) {
    const clientEmail = client.email as string | null
    if (!clientEmail) {
      return {
        data: null,
        error: { message: 'Email client manquant — impossible de créer le compte Pennylane', code: 'MISSING_EMAIL' },
      }
    }
    const customerResult = await pennylaneClient.post<{ id: number }>('/company_customers', {
      name: (client.company as string | null) ?? (client.name as string),
      emails: [clientEmail],
      billing_address: { address: '', postal_code: '', city: '', country_alpha2: 'FR' },
    })
    if (customerResult.error || !customerResult.data) {
      return { data: null, error: customerResult.error ?? { message: 'Échec création Pennylane', code: 'PENNYLANE_ERROR' } }
    }
    pennylaneCustomerId = String(customerResult.data.id)
    await supabase.from('clients').update({ pennylane_customer_id: pennylaneCustomerId }).eq('id', clientId)
  }

  // Deadline = aujourd'hui + 30 jours
  const deadline = new Date()
  deadline.setDate(deadline.getDate() + 30)
  const deadlineStr = deadline.toISOString().split('T')[0]

  // Story 11.6 — Déduction forfait Lab si applicable
  const clientLabPaid = client.lab_paid as boolean | null
  const applyLabDeduction = options.labDeduction === true && clientLabPaid === true

  // Calcul déduction plafonnée (AC#3: si setup < 199€, net = 0€, pas de remboursement)
  const setupTotalHt = lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0)
  const cappedDeduction = Math.min(199, setupTotalHt)

  const allLineItems = applyLabDeduction && cappedDeduction > 0
    ? [
        ...lineItems,
        {
          label: 'Déduction forfait Lab MonprojetPro',
          description: 'Le forfait Lab (199€) est déduit du setup One, comme convenu.',
          quantity: 1,
          unitPrice: -cappedDeduction,
          vatRate: 'FR_200',
          unit: 'piece',
          total: -cappedDeduction,
        },
      ]
    : lineItems

  // Mapping LineItems → PennylaneLineItems
  const pennylaneLineItems = allLineItems.map(toPennylaneLineItem)

  const today = new Date().toISOString().split('T')[0]

  // V2 API : pas de wrapper, invoice_lines au lieu de line_items, date obligatoire
  // Les devis sont créés en status "pending" par défaut — pas besoin de finalize
  const quoteResult = await pennylaneClient.post<PennylaneQuote>('/quotes', {
    customer_id: parseInt(pennylaneCustomerId, 10),
    date: today,
    deadline: deadlineStr,
    invoice_lines: pennylaneLineItems,
    pdf_invoice_free_text: applyLabDeduction
      ? `${options.publicNotes ?? ''} [LAB_DEDUCTION:19900]`.trim()
      : (options.publicNotes ?? null),
  })

  if (quoteResult.error) return { data: null, error: quoteResult.error }
  if (!quoteResult.data) return { data: null, error: { message: 'No data returned', code: 'EMPTY_RESPONSE' } }

  // V2 : réponse directe (pas de { quote: ... } wrapper)
  const createdQuote = quoteResult.data

  // Notification in-app pour le client
  const clientAuthUserId = client.auth_user_id as string | null
  if (clientAuthUserId) {
    const totalTtc = (createdQuote.amount ?? 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
    const { error: notifError } = await supabase.from('notifications').insert({
      type: 'payment',
      title: `Nouveau devis de MiKL — ${totalTtc}`,
      body: options.publicNotes ?? null,
      recipient_type: 'client',
      recipient_id: clientAuthUserId,
      link: '/modules/facturation',
    })
    if (notifError) {
      console.warn('[FACTURATION:CREATE_QUOTE] Notification insert failed:', notifError)
    }
  }

  // Story 13.4 — Persist quote metadata (quote_type, idempotence anchor for webhook)
  if (options.quoteType) {
    const totalHtNumeric = Number(createdQuote.currency_amount_before_tax ?? 0) || setupTotalHt
    const { error: metadataError } = await supabase.from('quote_metadata').insert({
      pennylane_quote_id: String(createdQuote.id),
      client_id: clientId,
      quote_type: options.quoteType,
      total_amount_ht: totalHtNumeric,
    })
    if (metadataError) {
      // Non-bloquant : le devis est deja cree cote Pennylane. On log et on alerte.
      console.error('[FACTURATION:CREATE_QUOTE] quote_metadata insert failed:', metadataError)
    }
  }

  // Patch 2026-04-15 — INSERT direct dans billing_sync pour visibilite immediate
  // dans la liste des devis du Hub. L Edge Function billing-sync (cron) ne sync que
  // les invoices/customers cote Pennylane et de toute facon n etait pas deployee :
  // les devis n apparaissaient JAMAIS dans le Hub. Fix : on miroir le devis
  // immediatement a la creation pour que la liste se rafraichisse sans Edge Function.
  const amountCents = Math.round(parseFloat(String(createdQuote.amount ?? '0')) * 100)
  const { error: billingSyncError } = await supabase.from('billing_sync').upsert(
    {
      entity_type: 'quote',
      pennylane_id: String(createdQuote.id),
      client_id: clientId,
      status: createdQuote.status ?? 'draft',
      data: createdQuote as unknown as Record<string, unknown>,
      amount: Number.isFinite(amountCents) ? amountCents : null,
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: 'entity_type,pennylane_id' }
  )
  if (billingSyncError) {
    console.warn('[FACTURATION:CREATE_QUOTE] billing_sync upsert failed:', billingSyncError)
  }

  // Sync Edge Function (best effort, ne bloque pas si non deployee)
  try {
    await triggerBillingSync(clientId)
  } catch (syncErr) {
    console.warn('[FACTURATION:CREATE_QUOTE] triggerBillingSync skipped:', syncErr)
  }

  // Patch 2026-04-15 — Si sendNow=true, declencher l envoi par email cote Pennylane
  // Avant ce patch, le bouton "Envoyer au client" creait juste le devis sans
  // jamais l envoyer. POST /quotes/{id}/send_by_email peut renvoyer 409 si le
  // PDF Pennylane n est pas encore genere → on log mais on ne bloque pas.
  let emailSent = false
  if (options.sendNow === true) {
    const sendResult = await pennylaneClient.post<unknown>(
      `/quotes/${createdQuote.id}/send_by_email`,
      {}
    )
    if (sendResult.error) {
      console.warn(
        '[FACTURATION:CREATE_QUOTE] send_by_email failed (devis cree mais pas envoye):',
        sendResult.error
      )
    } else {
      emailSent = true
    }
  }

  // Activity log
  const { error: logError } = await supabase.from('activity_logs').insert({
    actor_type: 'operator',
    actor_id: userId,
    action: 'quote_created',
    entity_type: 'quote',
    metadata: {
      pennylane_quote_id: createdQuote.id,
      quote_number: createdQuote.quote_number,
      client_id: clientId,
      quote_type: options.quoteType ?? null,
      send_now: options.sendNow ?? false,
      email_sent: emailSent,
    },
  })
  if (logError) {
    console.warn('[FACTURATION:CREATE_QUOTE] Activity log insert failed:', logError)
  }

  return { data: String(createdQuote.id), error: null }
}

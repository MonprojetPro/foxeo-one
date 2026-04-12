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

  // Sync immédiat billing_sync
  await triggerBillingSync(clientId)

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
      send_now: options.sendNow ?? false,
    },
  })
  if (logError) {
    console.warn('[FACTURATION:CREATE_QUOTE] Activity log insert failed:', logError)
  }

  return { data: createdQuote.id, error: null }
}

'use server'

import { pennylaneClient } from '../config/pennylane'
import { toPennylaneLineItem } from '../utils/billing-mappers'
import { triggerBillingSync } from './trigger-billing-sync'
import { assertOperator } from './assert-operator'
import type { ActionResponse } from '@foxeo/types'
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
    .select('id, name, auth_user_id, pennylane_customer_id')
    .eq('id', clientId)
    .single()

  if (clientError || !client) {
    return {
      data: null,
      error: { message: 'Client introuvable', code: 'CLIENT_NOT_FOUND', details: clientError },
    }
  }

  const pennylaneCustomerId = client.pennylane_customer_id as string | null
  if (!pennylaneCustomerId) {
    return {
      data: null,
      error: {
        message: 'Ce client n\'a pas de compte Pennylane. Créez-le d\'abord.',
        code: 'NO_PENNYLANE_ID',
      },
    }
  }

  // Deadline = aujourd'hui + 30 jours
  const deadline = new Date()
  deadline.setDate(deadline.getDate() + 30)
  const deadlineStr = deadline.toISOString().split('T')[0]

  // Mapping LineItems → PennylaneLineItems
  const pennylaneLineItems = lineItems.map(toPennylaneLineItem)

  // POST /quotes
  const quoteResult = await pennylaneClient.post<{ quote: PennylaneQuote }>('/quotes', {
    quote: {
      customer_id: pennylaneCustomerId,
      deadline: deadlineStr,
      line_items: pennylaneLineItems,
      pdf_invoice_free_text: options.publicNotes ?? null,
    },
  })

  if (quoteResult.error) return { data: null, error: quoteResult.error }
  if (!quoteResult.data) return { data: null, error: { message: 'No data returned', code: 'EMPTY_RESPONSE' } }

  const createdQuote = quoteResult.data.quote

  // Si sendNow: finaliser le devis (status → 'pending', Pennylane envoie l'email PDF)
  if (options.sendNow) {
    const finalizeResult = await pennylaneClient.post<{ quote: PennylaneQuote }>(
      `/quotes/${createdQuote.id}/finalize`,
      {}
    )
    if (finalizeResult.error) {
      console.warn(`[FACTURATION:CREATE_QUOTE] Finalize failed for quote ${createdQuote.id}:`, finalizeResult.error)
    }
  }

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

'use server'

import { pennylaneClient } from '../config/pennylane'
import { triggerBillingSync } from './trigger-billing-sync'
import { assertOperator } from './assert-operator'
import { createPennylaneCustomer } from './billing-proxy'
import { LAB_INVOICE_TAG } from '../utils/billing-sync-logic'
import type { ActionResponse } from '@monprojetpro/types'

// ============================================================
// sendLabInvoice — crée la facture Lab 199€ pour un client
// Réservé aux opérateurs. Guard : lab_paid = false.
// Identifiant interne : [FOXEO_LAB] dans pdf_invoice_free_text
// ============================================================

const LAB_FORFAIT_AMOUNT = 199

export async function sendLabInvoice(clientId: string): Promise<ActionResponse<string>> {
  const { supabase, userId, error: authError } = await assertOperator()
  if (authError || !supabase || !userId) return { data: null, error: authError }

  // Récupérer le client
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

  // Guard : forfait Lab déjà payé
  if (client.lab_paid) {
    return {
      data: null,
      error: { message: 'Ce client a déjà payé le forfait Lab', code: 'LAB_ALREADY_PAID' },
    }
  }

  // Guard : vérifier qu'il n'y a pas déjà une facture Lab en attente
  const { data: existingLabInvoices } = await supabase
    .from('billing_sync')
    .select('id')
    .eq('entity_type', 'invoice')
    .in('status', ['pending', 'unpaid'])
    .contains('data', { is_lab_invoice: true, client_id: clientId })
    .limit(1)

  if (existingLabInvoices && existingLabInvoices.length > 0) {
    return {
      data: null,
      error: { message: 'Une facture Lab est déjà en cours pour ce client', code: 'LAB_INVOICE_PENDING' },
    }
  }

  let pennylaneCustomerId = client.pennylane_customer_id as string | null

  // Auto-création du compte Pennylane si absent (même logique que create-quote / create-subscription)
  if (!pennylaneCustomerId) {
    const clientEmail = client.email as string | null
    if (!clientEmail) {
      return {
        data: null,
        error: { message: 'Email client requis pour créer le compte Pennylane', code: 'MISSING_EMAIL' },
      }
    }
    const customerResult = await createPennylaneCustomer(
      clientId,
      (client.company as string | null) ?? (client.name as string),
      clientEmail,
    )
    if (customerResult.error) return { data: null, error: customerResult.error }
    pennylaneCustomerId = customerResult.data!
  }

  // Dates
  const date = new Date().toISOString().split('T')[0]
  const deadline = new Date()
  deadline.setDate(deadline.getDate() + 30)
  const deadlineStr = deadline.toISOString().split('T')[0]

  // POST /customer_invoices Pennylane — V2 : pas de wrapper, invoice_lines, raw_currency_unit_price string
  const invoiceResult = await pennylaneClient.post<{ id: number; invoice_number: string }>(
    '/customer_invoices',
    {
      customer_id: pennylaneCustomerId,
      date,
      deadline: deadlineStr,
      invoice_lines: [
        {
          label: 'Forfait Lab MonprojetPro',
          quantity: 1,
          raw_currency_unit_price: LAB_FORFAIT_AMOUNT.toFixed(2),
          vat_rate: 'FR_200',
          unit: 'piece',
        },
      ],
      pdf_invoice_free_text: LAB_INVOICE_TAG,
    }
  )

  if (invoiceResult.error) return { data: null, error: invoiceResult.error }
  if (!invoiceResult.data) return { data: null, error: { message: 'No data returned', code: 'EMPTY_RESPONSE' } }

  // V2 : réponse directe (pas de wrapper { customer_invoice: ... }), id est un number
  const createdInvoice = invoiceResult.data

  // Stocker dans billing_sync pour tracking
  await supabase
    .from('billing_sync')
    .upsert(
      {
        entity_type: 'invoice',
        pennylane_id: String(createdInvoice.id),
        status: 'pending',
        amount: LAB_FORFAIT_AMOUNT * 100,
        data: { is_lab_invoice: true, label: 'Forfait Lab MonprojetPro', client_id: clientId },
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: 'entity_type,pennylane_id' }
    )

  // Activity log
  await supabase.from('activity_logs').insert({
    actor_type: 'operator',
    actor_id: userId,
    action: 'lab_invoice_sent',
    entity_type: 'invoice',
    metadata: {
      pennylane_invoice_id: String(createdInvoice.id),
      invoice_number: createdInvoice.invoice_number,
      client_id: clientId,
      amount: LAB_FORFAIT_AMOUNT,
    },
  })

  // Persister la date d'envoi de la facture Lab
  await supabase
    .from('clients')
    .update({ lab_invoice_sent_at: new Date().toISOString() })
    .eq('id', clientId)

  // Sync immédiat Pennylane
  await triggerBillingSync(clientId)

  return { data: String(createdInvoice.id), error: null }
}

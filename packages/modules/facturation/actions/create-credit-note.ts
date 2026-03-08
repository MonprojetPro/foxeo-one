'use server'

import { z } from 'zod'
import { pennylaneClient } from '../config/pennylane'
import { triggerBillingSync } from './trigger-billing-sync'
import { assertOperator } from './assert-operator'
import type { ActionResponse } from '@foxeo/types'

// ── Schema ────────────────────────────────────────────────────────────────────

const CreateCreditNoteSchema = z.object({
  invoiceId: z.string().uuid('ID facture invalide'),
  amount: z.number().positive('Le montant doit être positif'),
  reason: z.string().min(1, 'La raison est requise'),
})

type PennylaneCreditNote = {
  id: string
  customer_id: string
  invoice_number: string
  status: string
  amount: number
}

// ============================================================
// createCreditNote — génère un avoir Pennylane pour une facture
// Réservé aux opérateurs (is_operator())
// ============================================================

export async function createCreditNote(
  invoiceId: string,
  amount: number,
  reason: string
): Promise<ActionResponse<string>> {
  const { supabase, userId, error: authError } = await assertOperator()
  if (authError || !supabase || !userId) return { data: null, error: authError }

  // Validation Zod
  const parsed = CreateCreditNoteSchema.safeParse({ invoiceId, amount, reason })
  if (!parsed.success) {
    return {
      data: null,
      error: {
        message: parsed.error.issues[0]?.message ?? 'Données invalides',
        code: 'VALIDATION_ERROR',
        details: parsed.error.issues,
      },
    }
  }

  // Récupérer la facture dans billing_sync
  const { data: syncRow, error: syncError } = await supabase
    .from('billing_sync')
    .select('pennylane_id, client_id, amount')
    .eq('id', invoiceId)
    .eq('entity_type', 'invoice')
    .single()

  if (syncError || !syncRow) {
    return {
      data: null,
      error: {
        message: 'Facture introuvable',
        code: 'INVOICE_NOT_FOUND',
        details: syncError,
      },
    }
  }

  // Vérifier que le montant ne dépasse pas la facture originale
  // Note: billing_sync.amount est en centimes (×100), amount est en euros
  const invoiceAmountCents = syncRow.amount ?? 0
  const amountCents = Math.round(amount * 100)
  if (amountCents > invoiceAmountCents) {
    const invoiceEuros = invoiceAmountCents / 100
    return {
      data: null,
      error: {
        message: `Le montant de l'avoir (${amount}€) ne peut pas dépasser le montant de la facture (${invoiceEuros}€)`,
        code: 'AMOUNT_EXCEEDS_INVOICE',
      },
    }
  }

  const clientId = syncRow.client_id as string | null
  if (!clientId) {
    return {
      data: null,
      error: { message: 'Client introuvable pour cette facture', code: 'CLIENT_NOT_FOUND' },
    }
  }

  // Récupérer le pennylane_customer_id du client
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('pennylane_customer_id, auth_user_id, name')
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
      error: { message: 'Client sans compte Pennylane', code: 'NO_PENNYLANE_ID' },
    }
  }

  // POST /customer_invoices avec type credit_note
  const creditNoteResult = await pennylaneClient.post<{ customer_invoice: PennylaneCreditNote }>(
    '/customer_invoices',
    {
      customer_invoice: {
        customer_id: pennylaneCustomerId,
        invoice_type: 'credit_note',
        currency_amount: amount,
        pdf_invoice_free_text: reason,
        linked_to_invoice_number: syncRow.pennylane_id,
      },
    }
  )

  if (creditNoteResult.error) return { data: null, error: creditNoteResult.error }
  if (!creditNoteResult.data) {
    return { data: null, error: { message: 'Aucune donnée retournée', code: 'EMPTY_RESPONSE' } }
  }

  const createdNote = creditNoteResult.data.customer_invoice

  // Notification in-app pour le client
  const clientAuthUserId = client.auth_user_id as string | null
  if (clientAuthUserId) {
    const formattedAmount = amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
    const { error: notifError } = await supabase.from('notifications').insert({
      type: 'payment',
      title: `Avoir de ${formattedAmount} émis`,
      body: reason,
      recipient_type: 'client',
      recipient_id: clientAuthUserId,
      link: '/modules/facturation',
    })
    if (notifError) {
      console.warn('[FACTURATION:CREATE_CREDIT_NOTE] Notification insert failed:', notifError)
    }
  }

  // Sync immédiat
  await triggerBillingSync(clientId)

  // Activity log
  const { error: logError } = await supabase.from('activity_logs').insert({
    actor_type: 'operator',
    actor_id: userId,
    action: 'credit_note_created',
    entity_type: 'invoice',
    metadata: {
      pennylane_credit_note_id: createdNote.id,
      original_invoice_pennylane_id: syncRow.pennylane_id,
      client_id: clientId,
      amount,
      reason,
    },
  })
  if (logError) {
    console.warn('[FACTURATION:CREATE_CREDIT_NOTE] Activity log insert failed:', logError)
  }

  return { data: createdNote.id, error: null }
}

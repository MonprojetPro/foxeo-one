'use server'

import { pennylaneClient } from '../config/pennylane'
import { toPennylaneLineItem } from '../utils/billing-mappers'
import { sendByEmailWithRetry } from '../utils/send-by-email-with-retry'
import { assertOperator } from './assert-operator'
import type { ActionResponse } from '@monprojetpro/types'
import type { LineItem, PennylaneQuote, QuoteType } from '../types/billing.types'

// ============================================================
// updateQuote — Workflow cancel + recreate (Story 13.4 patch)
//
// Pourquoi pas un PUT direct ?
// Pennylane V2 PUT /quotes/{id} attend invoice_lines en objet avec un schema
// non documente publiquement. Apres plusieurs tentatives (array, hash indexe,
// { add: [...] }), tous les formats ont ete rejetes par leur validateur.
//
// Workaround : on utilise les endpoints qui marchent (POST + update_status)
//   1. Cancel l ancien devis (update_status: denied)
//   2. Cree un nouveau devis avec les modifs
//   3. Migre quote_metadata vers le nouveau pennylane_quote_id
//   4. Si l ancien etait deja envoye au client (sent_at != null) ET autoResend=true
//      → renvoie automatiquement le nouveau via send_by_email
//
// Inconvenient assume : le numero de devis change (D-046 → D-047). C est une
// contrainte Pennylane (loi anti-fraude TVA FR : numerotation immutable).
// ============================================================

export interface UpdateQuotePayload {
  lineItems: LineItem[]
  publicNotes?: string | null
  /** Si true et que l ancien devis avait sent_at != null, renvoie auto le nouveau */
  autoResend?: boolean
}

interface UpdateQuoteResult {
  oldPennylaneQuoteId: string
  newPennylaneQuoteId: string
  newQuoteNumber: string | null
  resent: boolean
  wasOriginallySent: boolean
}

export async function updateQuote(
  pennylaneQuoteId: string,
  payload: UpdateQuotePayload
): Promise<ActionResponse<UpdateQuoteResult>> {
  const { supabase, userId, error: authError } = await assertOperator()
  if (authError || !supabase || !userId) return { data: null, error: authError }

  if (!pennylaneQuoteId) {
    return { data: null, error: { message: 'pennylaneQuoteId requis', code: 'VALIDATION_ERROR' } }
  }
  if (!Array.isArray(payload.lineItems) || payload.lineItems.length === 0) {
    return { data: null, error: { message: 'Au moins une ligne requise', code: 'VALIDATION_ERROR' } }
  }

  // 1. Lire les metadonnees actuelles (client_id, quote_type, sent_at, customer)
  const { data: existingMetadata, error: metadataError } = await supabase
    .from('quote_metadata')
    .select('client_id, quote_type, sent_at')
    .eq('pennylane_quote_id', pennylaneQuoteId)
    .maybeSingle()

  if (metadataError) {
    return {
      data: null,
      error: { message: 'Lecture quote_metadata echouee', code: 'DATABASE_ERROR', details: metadataError },
    }
  }

  if (!existingMetadata) {
    return {
      data: null,
      error: {
        message: 'Devis introuvable dans quote_metadata',
        code: 'METADATA_NOT_FOUND',
      },
    }
  }

  const wasOriginallySent = existingMetadata.sent_at !== null
  const clientId = existingMetadata.client_id as string
  const quoteType = existingMetadata.quote_type as QuoteType

  // 2. Recuperer le pennylane_customer_id du client
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('pennylane_customer_id')
    .eq('id', clientId)
    .single()

  if (clientError || !client?.pennylane_customer_id) {
    return {
      data: null,
      error: {
        message: 'Client ou compte Pennylane introuvable',
        code: 'CLIENT_NOT_FOUND',
        details: clientError,
      },
    }
  }
  const pennylaneCustomerId = client.pennylane_customer_id as string

  // 3. Annuler l ancien devis cote Pennylane (denied = annule)
  const cancelResult = await pennylaneClient.put<unknown>(
    `/quotes/${pennylaneQuoteId}/update_status`,
    { status: 'denied' }
  )
  if (cancelResult.error) {
    console.error('[FACTURATION:UPDATE_QUOTE] Cancel ancien devis echoue:', cancelResult.error)
    return {
      data: null,
      error: {
        message: `Impossible d annuler l ancien devis : ${cancelResult.error.message}`,
        code: cancelResult.error.code,
        details: cancelResult.error,
      },
    }
  }

  // 4. Creer le nouveau devis avec les modifications
  const today = new Date().toISOString().split('T')[0]
  const deadline = new Date()
  deadline.setDate(deadline.getDate() + 30)
  const deadlineStr = deadline.toISOString().split('T')[0]

  const pennylaneLineItems = payload.lineItems.map(toPennylaneLineItem)

  const createResult = await pennylaneClient.post<PennylaneQuote>('/quotes', {
    customer_id: parseInt(pennylaneCustomerId, 10),
    date: today,
    deadline: deadlineStr,
    invoice_lines: pennylaneLineItems,
    pdf_invoice_free_text: payload.publicNotes ?? null,
  })

  if (createResult.error || !createResult.data) {
    console.error('[FACTURATION:UPDATE_QUOTE] Creation nouveau devis echouee:', createResult.error)
    return {
      data: null,
      error: createResult.error ?? { message: 'Reponse vide Pennylane', code: 'EMPTY_RESPONSE' },
    }
  }

  const newQuote = createResult.data
  const newPennylaneId = String(newQuote.id)

  // 5. Migrer quote_metadata vers le nouveau pennylane_quote_id
  // Strategie : insert nouveau + delete ancien. La PK est pennylane_quote_id.
  const { error: insertMetaError } = await supabase.from('quote_metadata').insert({
    pennylane_quote_id: newPennylaneId,
    client_id: clientId,
    quote_type: quoteType,
    total_amount_ht: Number(newQuote.currency_amount_before_tax ?? 0),
  })
  if (insertMetaError) {
    console.warn('[FACTURATION:UPDATE_QUOTE] insert nouveau quote_metadata echec:', insertMetaError)
  }

  await supabase.from('quote_metadata').delete().eq('pennylane_quote_id', pennylaneQuoteId)

  // 6. Mettre a jour billing_sync : marquer ancien comme cancelled_by_operator
  // ET inserer le nouveau en pending pour visibilite immediate dans le Hub
  const nowIso = new Date().toISOString()

  const { data: oldRow } = await supabase
    .from('billing_sync')
    .select('data')
    .eq('entity_type', 'quote')
    .eq('pennylane_id', pennylaneQuoteId)
    .maybeSingle()

  const oldDataMerged = {
    ...((oldRow?.data as Record<string, unknown> | null) ?? {}),
    cancelled_by_operator: true,
    cancelled_at: nowIso,
    replaced_by: newPennylaneId,
  }

  await supabase
    .from('billing_sync')
    .update({ status: 'denied', data: oldDataMerged, last_synced_at: nowIso })
    .eq('entity_type', 'quote')
    .eq('pennylane_id', pennylaneQuoteId)

  const amountCents = Math.round(parseFloat(String(newQuote.amount ?? '0')) * 100)
  await supabase.from('billing_sync').upsert(
    {
      entity_type: 'quote',
      pennylane_id: newPennylaneId,
      client_id: clientId,
      status: newQuote.status ?? 'pending',
      data: {
        ...(newQuote as unknown as Record<string, unknown>),
        replaces: pennylaneQuoteId,
        original_line_items: payload.lineItems,
      },
      amount: Number.isFinite(amountCents) ? amountCents : null,
      last_synced_at: nowIso,
    },
    { onConflict: 'entity_type,pennylane_id' }
  )

  // 7. Si autoResend demande → envoyer automatiquement le nouveau devis
  // (avec retry car Pennylane prend ~5s a generer le PDF apres POST /quotes)
  let resent = false
  if (payload.autoResend === true) {
    const sendResult = await sendByEmailWithRetry(newPennylaneId)
    if (sendResult.sent) {
      resent = true
      await supabase
        .from('quote_metadata')
        .update({ sent_at: nowIso })
        .eq('pennylane_quote_id', newPennylaneId)
    } else {
      console.warn(
        `[FACTURATION:UPDATE_QUOTE] Envoi auto echec apres ${sendResult.attempts} tentatives:`,
        sendResult.lastError
      )
    }
  }

  // Activity log
  await supabase.from('activity_logs').insert({
    actor_type: 'operator',
    actor_id: userId,
    action: 'quote_updated_via_recreate',
    entity_type: 'quote',
    metadata: {
      old_pennylane_quote_id: pennylaneQuoteId,
      new_pennylane_quote_id: newPennylaneId,
      new_quote_number: newQuote.quote_number,
      was_originally_sent: wasOriginallySent,
      resent,
    },
  })

  return {
    data: {
      oldPennylaneQuoteId: pennylaneQuoteId,
      newPennylaneQuoteId: newPennylaneId,
      newQuoteNumber: newQuote.quote_number ?? null,
      resent,
      wasOriginallySent,
    },
    error: null,
  }
}

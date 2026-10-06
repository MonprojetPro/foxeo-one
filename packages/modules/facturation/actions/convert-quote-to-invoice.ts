'use server'

import { pennylaneClient } from '../config/pennylane'
import { toPennylaneLineItem } from '../utils/billing-mappers'
import { sendByEmailWithRetry } from '../utils/send-by-email-with-retry'
import { assertOperator } from './assert-operator'
import { getQuoteWithLines } from './get-quote-with-lines'
import type { ActionResponse } from '@monprojetpro/types'
import type { PennylaneQuote, LineItem } from '../types/billing.types'

// ============================================================
// convertQuoteToInvoice — cree une facture depuis un devis Pennylane
//
// 🔴 REECRIT LE 2026-10-06 (T-036) — cette action etait ecrite contre l API V1
// alors que le client HTTP tape V2 depuis des mois (config/pennylane.ts).
// Trois defauts, sur trente lignes :
//   1. elle lisait `quoteResult.data.quote` — un wrapper qui n existe qu en V1.
//      En V2 la reponse est plate, donc `quote` valait `undefined` et la ligne
//      suivante dereferencait `undefined.customer_id` : plantage au premier clic.
//   2. elle postait un wrapper `{ customer_invoice: { … } }` avec `line_items`,
//      la ou V2 attend un corps PLAT avec `invoice_lines` et `date`.
//   3. elle copiait `quote.line_items`, un champ qui n existe pas en V2 : les
//      lignes y sont une ressource separee (`GET /quotes/:id/invoice_lines`),
//      exposee par la brique getQuoteWithLines.
//
// Ses tests ne l avaient pas vu parce qu ils mockaient la reponse Pennylane
// A LA FORME V1 — ils validaient le code contre une API qu on n appelle plus.
// ============================================================

export type ConvertQuoteResult = {
  pennylaneInvoiceId: string
  invoiceNumber: string | null
  emailSent: boolean
  totalHt: number
}

export async function convertQuoteToInvoice(
  pennylaneQuoteId: string,
  clientId: string,
  options: { sendNow?: boolean } = {}
): Promise<ActionResponse<ConvertQuoteResult>> {
  const { supabase, userId, error: authError } = await assertOperator()
  if (authError || !supabase || !userId) return { data: null, error: authError }

  if (!pennylaneQuoteId) {
    return { data: null, error: { message: 'pennylaneQuoteId requis', code: 'VALIDATION_ERROR' } }
  }

  // 0. Garde anti-double-facturation. Rien n empechait de convertir deux fois le
  //    meme devis : deux clics produisaient DEUX factures chez Pennylane, pour la
  //    meme prestation, avec deux numeros definitifs — donc deux avoirs a emettre
  //    pour rattraper. `quote_metadata.pennylane_invoice_id` existe pour ca.
  const { data: existingMetadata } = await supabase
    .from('quote_metadata')
    .select('pennylane_invoice_id')
    .eq('pennylane_quote_id', pennylaneQuoteId)
    .maybeSingle()

  const alreadyInvoiced = existingMetadata?.pennylane_invoice_id as string | null | undefined
  if (alreadyInvoiced) {
    return {
      data: null,
      error: {
        message: `Ce devis a déjà été converti en facture (${alreadyInvoiced}). Pour corriger, émets un avoir.`,
        code: 'ALREADY_INVOICED',
      },
    }
  }

  // 1. En-tete du devis — V2 : reponse PLATE, le client est dans `customer.id`
  const quoteResult = await pennylaneClient.get<PennylaneQuote>(`/quotes/${pennylaneQuoteId}`)
  if (quoteResult.error) return { data: null, error: quoteResult.error }
  if (!quoteResult.data) {
    return { data: null, error: { message: 'Devis introuvable', code: 'EMPTY_RESPONSE' } }
  }

  const quote = quoteResult.data
  const customerId = quote.customer?.id
  if (customerId == null) {
    return {
      data: null,
      error: {
        message: 'Client Pennylane absent du devis',
        code: 'INVALID_RESPONSE',
        details: quoteResult.data,
      },
    }
  }

  // 2. Lignes du devis — ressource separee en V2, via la brique existante.
  //    Repli sur le miroir local billing_sync si l API ne les rend pas : les
  //    lignes d origine y sont ecrites a la creation du devis (create-quote).
  let lineItems: LineItem[] = []
  const linesResult = await getQuoteWithLines(pennylaneQuoteId)
  if (linesResult.data && linesResult.data.lineItems.length > 0) {
    lineItems = linesResult.data.lineItems
  } else {
    const { data: mirrored } = await supabase
      .from('billing_sync')
      .select('data')
      .eq('entity_type', 'quote')
      .eq('pennylane_id', pennylaneQuoteId)
      .maybeSingle()

    const original = (mirrored?.data as Record<string, unknown> | undefined)?.original_line_items
    if (Array.isArray(original) && original.length > 0) {
      lineItems = original as LineItem[]
      console.warn(
        `[FACTURATION:CONVERT_QUOTE] lignes reprises du miroir billing_sync pour le devis ${pennylaneQuoteId} (API muette)`
      )
    }
  }

  if (lineItems.length === 0) {
    return {
      data: null,
      error: {
        message: 'Impossible de récupérer les lignes du devis — facture non créée',
        code: 'QUOTE_LINES_EMPTY',
        details: linesResult.error,
      },
    }
  }

  const totalHt = lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0)

  // 3. Dates — V2 exige `date`. Echeance = emission + 30 jours.
  const date = new Date().toISOString().split('T')[0]
  const deadline = new Date()
  deadline.setDate(deadline.getDate() + 30)
  const deadlineStr = deadline.toISOString().split('T')[0]

  // 4. Creation de la facture — V2 : corps PLAT, `invoice_lines`
  const invoiceResult = await pennylaneClient.post<Record<string, unknown>>('/customer_invoices', {
    customer_id: customerId,
    date,
    deadline: deadlineStr,
    invoice_lines: lineItems.map(toPennylaneLineItem),
    pdf_invoice_free_text: quote.pdf_invoice_free_text ?? null,
  })

  if (invoiceResult.error) {
    console.error('[FACTURATION:CONVERT_QUOTE] Pennylane error details:', invoiceResult.error.details)
    return { data: null, error: invoiceResult.error }
  }
  if (!invoiceResult.data) {
    return { data: null, error: { message: 'No data returned', code: 'EMPTY_RESPONSE' } }
  }

  // V2 : reponse soit plate { id }, soit wrappee { customer_invoice: { id } }
  const rawInvoice = invoiceResult.data
  const createdInvoice =
    (rawInvoice.customer_invoice as Record<string, unknown> | undefined) ?? rawInvoice

  if (createdInvoice.id == null) {
    return {
      data: null,
      error: { message: 'Identifiant Pennylane absent de la réponse', code: 'INVALID_RESPONSE', details: rawInvoice },
    }
  }

  const pennylaneInvoiceId = String(createdInvoice.id)
  const invoiceNumber = (createdInvoice.invoice_number as string | null | undefined) ?? null

  // 5. Miroir billing_sync — la facture doit apparaitre dans le Hub sans
  //    attendre le cron. L ancienne version ne l ecrivait pas du tout.
  const amountRaw = createdInvoice.amount
  const amountCents =
    amountRaw != null ? Math.round(parseFloat(String(amountRaw)) * 100) : Math.round(totalHt * 100)

  const { error: billingSyncError } = await supabase.from('billing_sync').upsert(
    {
      entity_type: 'invoice',
      pennylane_id: pennylaneInvoiceId,
      client_id: clientId,
      status: (createdInvoice.status as string | undefined) ?? 'pending',
      data: {
        ...createdInvoice,
        original_line_items: lineItems,
        created_from: 'quote_conversion',
        source_pennylane_quote_id: pennylaneQuoteId,
      },
      amount: Number.isFinite(amountCents) ? amountCents : null,
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: 'entity_type,pennylane_id' }
  )
  if (billingSyncError) {
    console.warn('[FACTURATION:CONVERT_QUOTE] billing_sync upsert failed:', billingSyncError)
  }

  // 6. Rattacher la facture au devis d origine (tunnel de paiement Story 13.4)
  const { error: metadataError } = await supabase
    .from('quote_metadata')
    .update({ pennylane_invoice_id: pennylaneInvoiceId })
    .eq('pennylane_quote_id', pennylaneQuoteId)
  if (metadataError) {
    console.warn('[FACTURATION:CONVERT_QUOTE] quote_metadata update failed:', metadataError)
  }

  // 7. Envoi email optionnel, avec retry sur le 409 PDF_NOT_READY
  let emailSent = false
  if (options.sendNow === true) {
    const sendResult = await sendByEmailWithRetry(pennylaneInvoiceId, 'customer_invoices')
    emailSent = sendResult.sent
    if (!sendResult.sent) {
      console.warn(
        `[FACTURATION:CONVERT_QUOTE] send_by_email echoue apres ${sendResult.attempts} tentatives:`,
        sendResult.lastError
      )
    }
  }

  const { error: logError } = await supabase.from('activity_logs').insert({
    actor_type: 'operator',
    actor_id: userId,
    action: 'quote_converted',
    entity_type: 'invoice',
    metadata: {
      pennylane_quote_id: pennylaneQuoteId,
      pennylane_invoice_id: pennylaneInvoiceId,
      invoice_number: invoiceNumber,
      client_id: clientId,
      total_ht: totalHt,
      email_sent: emailSent,
    },
  })
  if (logError) {
    console.warn('[FACTURATION:CONVERT_QUOTE] Activity log insert failed:', logError)
  }

  return {
    data: { pennylaneInvoiceId, invoiceNumber, emailSent, totalHt },
    error: null,
  }
}

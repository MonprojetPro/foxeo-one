'use server'

import { pennylaneClient } from '../config/pennylane'
import { fromPennylaneInvoice } from '../utils/billing-mappers'
import { assertOperator } from './assert-operator'
import type { ActionResponse } from '@monprojetpro/types'
import type { Invoice, PennylaneQuote, PennylaneCustomerInvoice } from '../types/billing.types'

// ============================================================
// convertQuoteToInvoice — crée une facture depuis un devis Pennylane
// ============================================================

export async function convertQuoteToInvoice(
  pennylaneQuoteId: string,
  clientId: string
): Promise<ActionResponse<Invoice>> {
  const { supabase, userId, error: authError } = await assertOperator()
  if (authError || !supabase || !userId) return { data: null, error: authError }

  // Récupérer le devis Pennylane pour copier les line_items
  const quoteResult = await pennylaneClient.get<{ quote: PennylaneQuote }>(`/quotes/${pennylaneQuoteId}`)

  if (quoteResult.error) return { data: null, error: quoteResult.error }
  if (!quoteResult.data) return { data: null, error: { message: 'Devis introuvable', code: 'EMPTY_RESPONSE' } }

  const quote = quoteResult.data.quote

  // Deadline facture = aujourd'hui + 30 jours
  const deadline = new Date()
  deadline.setDate(deadline.getDate() + 30)
  const deadlineStr = deadline.toISOString().split('T')[0]

  // Créer la facture à partir du devis
  const invoiceResult = await pennylaneClient.post<{ customer_invoice: PennylaneCustomerInvoice }>(
    '/customer_invoices',
    {
      customer_invoice: {
        customer_id: quote.customer_id,
        deadline: deadlineStr,
        line_items: quote.line_items,
        pdf_invoice_free_text: quote.pdf_invoice_free_text,
      },
    }
  )

  if (invoiceResult.error) return { data: null, error: invoiceResult.error }
  if (!invoiceResult.data) return { data: null, error: { message: 'No data returned', code: 'EMPTY_RESPONSE' } }

  const createdInvoice = invoiceResult.data.customer_invoice

  // Activity log
  const { error: logError } = await supabase.from('activity_logs').insert({
    actor_type: 'operator',
    actor_id: userId,
    action: 'quote_converted',
    entity_type: 'invoice',
    metadata: {
      pennylane_quote_id: pennylaneQuoteId,
      pennylane_invoice_id: createdInvoice.id,
      client_id: clientId,
    },
  })
  if (logError) {
    console.warn('[FACTURATION:CONVERT_QUOTE] Activity log insert failed:', logError)
  }

  return { data: fromPennylaneInvoice(createdInvoice), error: null }
}

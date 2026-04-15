import type { SupabaseClient } from '@supabase/supabase-js'
import type { QuoteMetadataRow } from '../types/billing.types'

// Story 13.4 — Retrouve le quote_metadata associe a une facture Pennylane payee.
//
// Strategie :
//  1. Si pennylaneInvoiceId est fourni et deja enregistre, match direct
//  2. Sinon, si pennylaneQuoteId fourni, match via le quote d origine
//     + ecriture de pennylane_invoice_id pour les prochains webhooks
//  3. Sinon null

export interface MatchQuoteInput {
  pennylaneInvoiceId?: string | null
  pennylaneQuoteId?: string | null
}

export async function matchQuoteFromInvoice(
  supabase: SupabaseClient,
  input: MatchQuoteInput
): Promise<QuoteMetadataRow | null> {
  const { pennylaneInvoiceId, pennylaneQuoteId } = input

  if (pennylaneInvoiceId) {
    const { data } = await supabase
      .from('quote_metadata')
      .select('*')
      .eq('pennylane_invoice_id', pennylaneInvoiceId)
      .maybeSingle()
    if (data) return data as QuoteMetadataRow
  }

  if (pennylaneQuoteId) {
    const { data } = await supabase
      .from('quote_metadata')
      .select('*')
      .eq('pennylane_quote_id', pennylaneQuoteId)
      .maybeSingle()

    if (data && pennylaneInvoiceId && !data.pennylane_invoice_id) {
      // Premiere vue de la facture liee : on la memorise pour les prochains lookups
      await supabase
        .from('quote_metadata')
        .update({ pennylane_invoice_id: pennylaneInvoiceId })
        .eq('pennylane_quote_id', pennylaneQuoteId)
      return { ...(data as QuoteMetadataRow), pennylane_invoice_id: pennylaneInvoiceId }
    }

    if (data) return data as QuoteMetadataRow
  }

  return null
}

'use server'

import { pennylaneClient } from '../config/pennylane'
import { toPennylaneLineItem } from '../utils/billing-mappers'
import { assertOperator } from './assert-operator'
import type { ActionResponse } from '@monprojetpro/types'
import type { LineItem, PennylaneQuote } from '../types/billing.types'

// ============================================================
// updateQuote — modifie un devis existant Pennylane (PUT /quotes/:id)
// puis miroir local billing_sync. Story 13.4 patch — edition depuis le Hub
// sans avoir a passer par Pennylane. Pennylane V2 autorise l edition d un
// devis tant qu il n est pas accepted/denied/invoiced/expired.
// ============================================================

export interface UpdateQuotePayload {
  lineItems: LineItem[]
  publicNotes?: string | null
  deadline?: string // ISO yyyy-mm-dd
}

export async function updateQuote(
  pennylaneQuoteId: string,
  payload: UpdateQuotePayload
): Promise<ActionResponse<{ updated: true }>> {
  const { supabase, userId, error: authError } = await assertOperator()
  if (authError || !supabase || !userId) return { data: null, error: authError }

  if (!pennylaneQuoteId) {
    return {
      data: null,
      error: { message: 'pennylaneQuoteId requis', code: 'VALIDATION_ERROR' },
    }
  }

  if (!Array.isArray(payload.lineItems) || payload.lineItems.length === 0) {
    return {
      data: null,
      error: { message: 'Au moins une ligne requise', code: 'VALIDATION_ERROR' },
    }
  }

  const pennylaneLineItems = payload.lineItems.map(toPennylaneLineItem)

  const body: Record<string, unknown> = {
    invoice_lines: pennylaneLineItems,
    pdf_invoice_free_text: payload.publicNotes ?? null,
  }
  if (payload.deadline) body.deadline = payload.deadline

  const result = await pennylaneClient.put<PennylaneQuote>(
    `/quotes/${pennylaneQuoteId}`,
    body
  )

  if (result.error) {
    // Pennylane verrouille les devis accepted/denied/invoiced/expired
    if (result.error.code === 'PENNYLANE_409' || result.error.code === 'PENNYLANE_422') {
      return {
        data: null,
        error: {
          message:
            'Ce devis ne peut plus etre modifie (deja accepte, refuse ou facture).',
          code: 'QUOTE_LOCKED',
          details: result.error,
        },
      }
    }
    return { data: null, error: result.error }
  }

  // Sync miroir billing_sync local (preserve cancelled_by_operator / autres flags)
  if (result.data) {
    const updatedQuote = result.data
    const amountCents = Math.round(parseFloat(String(updatedQuote.amount ?? '0')) * 100)

    const { data: existing } = await supabase
      .from('billing_sync')
      .select('data')
      .eq('entity_type', 'quote')
      .eq('pennylane_id', pennylaneQuoteId)
      .maybeSingle()

    const preservedFlags = (existing?.data as Record<string, unknown> | null) ?? {}
    const mergedData = { ...preservedFlags, ...(updatedQuote as unknown as Record<string, unknown>) }

    const { error: syncError } = await supabase
      .from('billing_sync')
      .update({
        status: updatedQuote.status ?? 'pending',
        data: mergedData,
        amount: Number.isFinite(amountCents) ? amountCents : null,
        last_synced_at: new Date().toISOString(),
      })
      .eq('entity_type', 'quote')
      .eq('pennylane_id', pennylaneQuoteId)

    if (syncError) {
      console.warn('[FACTURATION:UPDATE_QUOTE] billing_sync update failed:', syncError)
    }
  }

  // Activity log
  const { error: logError } = await supabase.from('activity_logs').insert({
    actor_type: 'operator',
    actor_id: userId,
    action: 'quote_updated',
    entity_type: 'quote',
    metadata: { pennylane_quote_id: pennylaneQuoteId },
  })
  if (logError) {
    console.warn('[FACTURATION:UPDATE_QUOTE] Activity log insert failed:', logError)
  }

  return { data: { updated: true }, error: null }
}

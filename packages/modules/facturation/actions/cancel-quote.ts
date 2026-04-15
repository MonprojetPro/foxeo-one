'use server'

import { pennylaneClient } from '../config/pennylane'
import { assertOperator } from './assert-operator'
import type { ActionResponse } from '@monprojetpro/types'

// ============================================================
// cancelQuote — passe le statut du devis a 'denied' via
// PUT /quotes/{id}/update_status (statut Pennylane officiel)
//
// Pennylane n a PAS de DELETE quote — seul update_status existe.
// Statuts valides: pending | accepted | denied | invoiced | expired
// ============================================================

interface UpdateStatusResponse {
  id: number
  status: string
}

export async function cancelQuote(
  pennylaneQuoteId: string
): Promise<ActionResponse<{ status: string }>> {
  const { supabase, userId, error: authError } = await assertOperator()
  if (authError || !supabase || !userId) return { data: null, error: authError }

  if (!pennylaneQuoteId) {
    return {
      data: null,
      error: { message: 'pennylaneQuoteId requis', code: 'VALIDATION_ERROR' },
    }
  }

  const result = await pennylaneClient.put<UpdateStatusResponse>(
    `/quotes/${pennylaneQuoteId}/update_status`,
    { status: 'denied' }
  )

  if (result.error) return { data: null, error: result.error }

  // Synchroniser le statut local dans billing_sync (sans attendre le polling)
  const { error: syncError } = await supabase
    .from('billing_sync')
    .update({ status: 'denied', last_synced_at: new Date().toISOString() })
    .eq('entity_type', 'quote')
    .eq('pennylane_id', pennylaneQuoteId)

  if (syncError) {
    console.warn('[FACTURATION:CANCEL_QUOTE] billing_sync update failed:', syncError)
  }

  // Activity log
  const { error: logError } = await supabase.from('activity_logs').insert({
    actor_type: 'operator',
    actor_id: userId,
    action: 'quote_cancelled',
    entity_type: 'quote',
    metadata: { pennylane_quote_id: pennylaneQuoteId },
  })
  if (logError) {
    console.warn('[FACTURATION:CANCEL_QUOTE] Activity log insert failed:', logError)
  }

  return { data: { status: result.data?.status ?? 'denied' }, error: null }
}

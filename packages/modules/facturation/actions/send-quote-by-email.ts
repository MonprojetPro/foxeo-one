'use server'

import { pennylaneClient } from '../config/pennylane'
import { assertOperator } from './assert-operator'
import type { ActionResponse } from '@monprojetpro/types'

// ============================================================
// sendQuoteByEmail — declenche l envoi du devis par email
// via Pennylane (POST /quotes/{id}/send_by_email)
//
// Documentation Pennylane :
//   - 204 No Content si succes (email parti)
//   - 409 Conflict si le PDF du devis n est pas encore genere
//     (la generation prend quelques secondes apres la creation)
// ============================================================

export async function sendQuoteByEmail(
  pennylaneQuoteId: string
): Promise<ActionResponse<{ sent: boolean }>> {
  const { supabase, userId, error: authError } = await assertOperator()
  if (authError || !supabase || !userId) return { data: null, error: authError }

  if (!pennylaneQuoteId) {
    return {
      data: null,
      error: { message: 'pennylaneQuoteId requis', code: 'VALIDATION_ERROR' },
    }
  }

  const result = await pennylaneClient.post<unknown>(
    `/quotes/${pennylaneQuoteId}/send_by_email`,
    {}
  )

  if (result.error) {
    // 409 = PDF pas encore genere → message specifique
    if (result.error.code === 'PENNYLANE_409') {
      return {
        data: null,
        error: {
          message:
            'Le PDF du devis n est pas encore pret cote Pennylane. Reessayez dans quelques secondes.',
          code: 'PDF_NOT_READY',
          details: result.error,
        },
      }
    }
    return { data: null, error: result.error }
  }

  // Activity log
  const { error: logError } = await supabase.from('activity_logs').insert({
    actor_type: 'operator',
    actor_id: userId,
    action: 'quote_sent_by_email',
    entity_type: 'quote',
    metadata: { pennylane_quote_id: pennylaneQuoteId },
  })
  if (logError) {
    console.warn('[FACTURATION:SEND_QUOTE] Activity log insert failed:', logError)
  }

  return { data: { sent: true }, error: null }
}

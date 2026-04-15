'use server'

import { sendByEmailWithRetry } from '../utils/send-by-email-with-retry'
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

  // Helper avec retry pour gerer les 409 PDF_NOT_READY (Pennylane prend ~5s
  // a generer le PDF apres POST /quotes)
  const result = await sendByEmailWithRetry(pennylaneQuoteId)

  if (!result.sent) {
    if (result.lastError?.code === 'PENNYLANE_409') {
      return {
        data: null,
        error: {
          message:
            `Le PDF du devis n est toujours pas pret apres ${result.attempts} tentatives. Reessayez dans 30 secondes.`,
          code: 'PDF_NOT_READY',
          details: result.lastError,
        },
      }
    }
    return { data: null, error: result.lastError ?? { message: 'Echec envoi', code: 'UNKNOWN' } }
  }

  // Story 13.4 — Marquer le devis comme envoye dans quote_metadata pour
  // que le workflow de modification (cancel+recreate) puisse decider
  // s il faut renvoyer automatiquement le nouveau devis.
  const { error: metadataError } = await supabase
    .from('quote_metadata')
    .update({ sent_at: new Date().toISOString() })
    .eq('pennylane_quote_id', pennylaneQuoteId)
  if (metadataError) {
    console.warn('[FACTURATION:SEND_QUOTE] quote_metadata.sent_at update failed:', metadataError)
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

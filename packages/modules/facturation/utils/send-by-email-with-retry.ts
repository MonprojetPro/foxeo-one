import { pennylaneClient } from '../config/pennylane'
import type { ActionResponse } from '@monprojetpro/types'

// ============================================================
// sendByEmailWithRetry — retry POST /<resource>/:id/send_by_email
//
// Pennylane V2 met quelques secondes a generer le PDF apres la creation du
// document. Si on appelle send_by_email immediatement, on reçoit 409
// PDF_NOT_READY. Cette fonction retry jusqu a 5 fois avec un delai croissant
// pour laisser le PDF se generer.
//
// Total wait max : 1 + 2 + 3 + 4 + 5 = 15 secondes
//
// T-036 (2026-10-06) — la brique etait verrouillee sur `/quotes/`, alors que
// les FACTURES subissent exactement le meme 409 : sendLabInvoice postait
// send_by_email sans aucun retry et se contentait d un console.warn, donc un
// email de facture pouvait ne jamais partir sans que personne le sache. Le
// parametre `resource` generalise la brique a ses deux consommateurs reels.
// ============================================================

const MAX_RETRIES = 5
const BASE_DELAY_MS = 1000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Ressource Pennylane portant l endpoint send_by_email */
export type SendByEmailResource = 'quotes' | 'customer_invoices'

export interface SendByEmailWithRetryResult {
  sent: boolean
  attempts: number
  lastError: ActionResponse<unknown>['error'] | null
}

export async function sendByEmailWithRetry(
  pennylaneDocumentId: string,
  resource: SendByEmailResource = 'quotes'
): Promise<SendByEmailWithRetryResult> {
  let lastError: ActionResponse<unknown>['error'] = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const result = await pennylaneClient.post<unknown>(
      `/${resource}/${pennylaneDocumentId}/send_by_email`,
      {}
    )

    if (!result.error) {
      return { sent: true, attempts: attempt, lastError: null }
    }

    lastError = result.error

    // Si ce n est pas un 409 (PDF pas pret), pas la peine de retry
    if (result.error.code !== 'PENNYLANE_409') {
      return { sent: false, attempts: attempt, lastError }
    }

    // 409 → attendre puis retry (delai croissant: 1s, 2s, 3s, 4s, 5s)
    if (attempt < MAX_RETRIES) {
      await sleep(BASE_DELAY_MS * attempt)
    }
  }

  return { sent: false, attempts: MAX_RETRIES, lastError }
}

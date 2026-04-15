import { pennylaneClient } from '../config/pennylane'
import type { ActionResponse } from '@monprojetpro/types'

// ============================================================
// sendByEmailWithRetry — retry POST /quotes/:id/send_by_email
//
// Pennylane V2 met quelques secondes a generer le PDF apres POST /quotes.
// Si on appelle send_by_email immediatement, on reçoit 409 PDF_NOT_READY.
// Cette fonction retry jusqu a 5 fois avec un delai croissant pour laisser
// le PDF se generer.
//
// Total wait max : 1 + 2 + 3 + 4 + 5 = 15 secondes
// ============================================================

const MAX_RETRIES = 5
const BASE_DELAY_MS = 1000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export interface SendByEmailWithRetryResult {
  sent: boolean
  attempts: number
  lastError: ActionResponse<unknown>['error'] | null
}

export async function sendByEmailWithRetry(
  pennylaneQuoteId: string
): Promise<SendByEmailWithRetryResult> {
  let lastError: ActionResponse<unknown>['error'] = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const result = await pennylaneClient.post<unknown>(
      `/quotes/${pennylaneQuoteId}/send_by_email`,
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

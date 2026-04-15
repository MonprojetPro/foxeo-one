'use server'

import { pennylaneClient } from '../config/pennylane'
import { assertOperator } from './assert-operator'
import type { ActionResponse } from '@monprojetpro/types'
import type { PennylaneQuote, LineItem } from '../types/billing.types'

// ============================================================
// getQuoteWithLines — recupere un devis Pennylane + ses lignes
//
// Pennylane V2 retourne invoice_lines en lazy URL dans GET /quotes/{id}.
// Pour avoir les vraies lignes editables, on fait un second appel a
// GET /quotes/{id}/invoice_lines.
// ============================================================

interface PennylaneInvoiceLineV2 {
  id?: number
  label?: string
  description?: string | null
  quantity?: number | string
  unit?: string
  vat_rate?: string
  raw_currency_unit_price?: string
  unit_price?: number | string
}

interface InvoiceLinesResponse {
  invoice_lines?: PennylaneInvoiceLineV2[]
}

function pennylaneLineToLocal(pl: PennylaneInvoiceLineV2): LineItem {
  const quantity = Number(pl.quantity ?? 1)
  const unitPrice = Number(pl.raw_currency_unit_price ?? pl.unit_price ?? 0)
  return {
    label: pl.label ?? '',
    description: pl.description ?? null,
    quantity,
    unit: pl.unit ?? 'piece',
    unitPrice,
    vatRate: pl.vat_rate ?? 'FR_200',
    total: quantity * unitPrice,
  }
}

export interface QuoteWithLines {
  pennylaneQuoteId: string
  publicNotes: string | null
  status: string
  lineItems: LineItem[]
}

export async function getQuoteWithLines(
  pennylaneQuoteId: string
): Promise<ActionResponse<QuoteWithLines>> {
  const { error: authError } = await assertOperator()
  if (authError) return { data: null, error: authError }

  if (!pennylaneQuoteId) {
    return { data: null, error: { message: 'pennylaneQuoteId requis', code: 'VALIDATION_ERROR' } }
  }

  // 1. Recuperer le devis (header public_file_url, notes, statut)
  const quoteResult = await pennylaneClient.get<PennylaneQuote>(`/quotes/${pennylaneQuoteId}`)
  if (quoteResult.error || !quoteResult.data) {
    return {
      data: null,
      error: quoteResult.error ?? { message: 'Devis introuvable', code: 'EMPTY_RESPONSE' },
    }
  }

  // 2. Recuperer les lignes (resource separee en V2)
  const linesResult = await pennylaneClient.get<InvoiceLinesResponse | PennylaneInvoiceLineV2[]>(
    `/quotes/${pennylaneQuoteId}/invoice_lines`
  )
  if (linesResult.error) {
    return { data: null, error: linesResult.error }
  }

  // L API peut retourner soit { invoice_lines: [...] } soit directement [...]
  const rawLines: PennylaneInvoiceLineV2[] = Array.isArray(linesResult.data)
    ? linesResult.data
    : linesResult.data?.invoice_lines ?? []

  return {
    data: {
      pennylaneQuoteId,
      publicNotes: quoteResult.data.pdf_invoice_free_text ?? null,
      status: quoteResult.data.status,
      lineItems: rawLines.map(pennylaneLineToLocal),
    },
    error: null,
  }
}

'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { createAndSendQuote, createInvoice, type LineItem } from '@monprojetpro/modules-facturation'
import { TransferCiiLinesInput as TransferCiiLinesSchema } from '../types/cii.types'
import type { CiiImportDB, CiiReformulationLineDB, TransferCiiLinesResult } from '../types/cii.types'

// ============================================================
// transferCiiLines — T-062
//
// Transfère les lignes validées vers le devis ou la facture — réutilise
// createAndSendQuote / createInvoice existants, aucun nouveau moteur de
// facturation (demande explicite de MiKL le 20-10).
// ============================================================

export async function transferCiiLines(input: unknown): Promise<ActionResponse<TransferCiiLinesResult>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return errorResponse('Non authentifié', 'UNAUTHORIZED')

    const parsed = TransferCiiLinesSchema.safeParse(input)
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues[0]?.message ?? 'Données invalides',
        'VALIDATION_ERROR',
        parsed.error.issues
      )
    }

    const { importId, lineIds, target, sendNow } = parsed.data

    const { data: importRow, error: importError } = await supabase
      .from('cii_imports')
      .select('*')
      .eq('id', importId)
      .single()

    if (importError || !importRow) {
      return errorResponse('Import CII introuvable', 'NOT_FOUND', importError)
    }

    const { data: lines, error: linesError } = await supabase
      .from('cii_reformulation_lines')
      .select('*')
      .eq('import_id', importId)
      .in('id', lineIds)

    if (linesError || !lines || lines.length !== lineIds.length) {
      return errorResponse('Lignes introuvables', 'NOT_FOUND', linesError)
    }

    const lineRows = lines as CiiReformulationLineDB[]
    const alreadyTransferred = lineRows.find((l) => l.status === 'transferred')
    if (alreadyTransferred) {
      return errorResponse(
        `La ligne « ${alreadyTransferred.function_name} » a déjà été transférée — double facturation évitée`,
        'VALIDATION_ERROR'
      )
    }
    const missingText = lineRows.find((l) => !l.reformulated_text?.trim())
    if (missingText) {
      return errorResponse(
        `La ligne « ${missingText.function_name} » n'a pas encore de reformulation`,
        'VALIDATION_ERROR'
      )
    }
    const missingTime = lineRows.find((l) => l.time_days === null || l.time_days === undefined)
    if (missingTime) {
      return errorResponse(
        `La ligne « ${missingTime.function_name} » n'a pas de temps renseigné`,
        'VALIDATION_ERROR'
      )
    }

    const tjm = (importRow as CiiImportDB).tjm_euros
    const lineItems: LineItem[] = lineRows.map((row) => {
      const quantity = row.time_days as number
      const total = Math.round(quantity * tjm * 100) / 100
      return {
        label: row.reformulated_text as string,
        description: null,
        quantity,
        unit: 'j',
        unitPrice: tjm,
        vatRate: 'FR_200',
        total,
      }
    })

    const clientId = (importRow as CiiImportDB).client_id

    const result = target === 'quote'
      ? await createAndSendQuote(clientId, lineItems, { sendNow: sendNow ?? false })
      : await createInvoice(clientId, lineItems, { sendNow: sendNow ?? false })

    if (result.error || !result.data) {
      return errorResponse(
        target === 'quote' ? 'Échec de la création du devis' : 'Échec de la création de la facture',
        'TRANSFER_FAILED',
        result.error
      )
    }

    const pennylaneId = target === 'quote'
      ? (result.data as string)
      : (result.data as { pennylaneInvoiceId: string }).pennylaneInvoiceId

    await supabase
      .from('cii_reformulation_lines')
      .update({ status: 'transferred', updated_at: new Date().toISOString() })
      .in('id', lineIds)

    return successResponse({ target, pennylaneId })
  } catch (error) {
    console.error('[CII:TRANSFER] Unexpected error:', error)
    return errorResponse('Erreur interne', 'INTERNAL_ERROR', error)
  }
}

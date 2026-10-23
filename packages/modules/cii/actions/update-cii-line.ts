'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { toCamelCase, toSnakeCase } from '@monprojetpro/utils'
import { UpdateCiiLineInput as UpdateCiiLineSchema } from '../types/cii.types'
import type { CiiReformulationLineDB, CiiReformulationLine } from '../types/cii.types'

// ============================================================
// updateCiiLine — T-062
//
// Toute ligne reste corrigible : le nom, le temps (le fichier ne porte pas
// toujours un temps exploitable) et le texte reformulé par l'IA. Décision du
// 23-10 : jamais d'estimation automatique, seulement la correction de MiKL.
// ============================================================

export async function updateCiiLine(input: unknown): Promise<ActionResponse<CiiReformulationLine>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return errorResponse('Non authentifié', 'UNAUTHORIZED')

    const parsed = UpdateCiiLineSchema.safeParse(input)
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues[0]?.message ?? 'Données invalides',
        'VALIDATION_ERROR',
        parsed.error.issues
      )
    }

    const { lineId, ...fields } = parsed.data

    // Une ligne déjà transférée a servi à émettre un devis/une facture réel —
    // la modifier après coup romprait la traçabilité (section 6 des consignes CII).
    const { data: current } = await supabase
      .from('cii_reformulation_lines')
      .select('status')
      .eq('id', lineId)
      .single()

    if (current?.status === 'transferred') {
      return errorResponse('Cette ligne a déjà été transférée — elle n\'est plus modifiable', 'FORBIDDEN')
    }

    const updates = toSnakeCase(fields) as unknown as Partial<CiiReformulationLineDB>

    const { data, error } = await supabase
      .from('cii_reformulation_lines')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', lineId)
      .select()
      .single()

    if (error || !data) {
      console.error('[CII:UPDATE_LINE] Error:', error)
      return errorResponse('Impossible de mettre à jour la ligne', 'UPDATE_FAILED', error)
    }

    return successResponse(toCamelCase(data as CiiReformulationLineDB) as unknown as CiiReformulationLine)
  } catch (error) {
    console.error('[CII:UPDATE_LINE] Unexpected error:', error)
    return errorResponse('Erreur interne', 'INTERNAL_ERROR', error)
  }
}

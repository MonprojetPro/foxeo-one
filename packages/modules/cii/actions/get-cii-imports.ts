'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { toCamelCase } from '@monprojetpro/utils'
import type { CiiImportDB, CiiReformulationLineDB, CiiImportWithLines } from '../types/cii.types'

export async function getCiiImports(clientId: string): Promise<ActionResponse<CiiImportWithLines[]>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return errorResponse('Non authentifié', 'UNAUTHORIZED')

    const { data: imports, error: importsError } = await supabase
      .from('cii_imports')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (importsError) {
      console.error('[CII:GET_IMPORTS] Error:', importsError)
      return errorResponse('Impossible de charger les imports CII', 'FETCH_FAILED', importsError)
    }

    const importRows = (imports ?? []) as CiiImportDB[]
    if (importRows.length === 0) return successResponse([])

    const { data: lines, error: linesError } = await supabase
      .from('cii_reformulation_lines')
      .select('*')
      .in('import_id', importRows.map((i) => i.id))
      .order('order_index', { ascending: true })

    if (linesError) {
      console.error('[CII:GET_IMPORTS] Lines error:', linesError)
      return errorResponse('Impossible de charger les lignes CII', 'FETCH_FAILED', linesError)
    }

    const lineRows = (lines ?? []) as CiiReformulationLineDB[]

    const result: CiiImportWithLines[] = importRows.map((importRow) => {
      const data = toCamelCase(importRow) as unknown as Omit<CiiImportWithLines, 'lines'>
      const importLines = lineRows
        .filter((l) => l.import_id === importRow.id)
        .map((row) => toCamelCase(row) as unknown as CiiImportWithLines['lines'][number])
      return { ...data, lines: importLines }
    })

    return successResponse(result)
  } catch (error) {
    console.error('[CII:GET_IMPORTS] Unexpected error:', error)
    return errorResponse('Erreur interne', 'INTERNAL_ERROR', error)
  }
}

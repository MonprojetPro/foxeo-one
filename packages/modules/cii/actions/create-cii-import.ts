'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { toCamelCase } from '@monprojetpro/utils'
import { parseCiiFunctionsFile } from '../utils/parse-cii-file'
import { CreateCiiImportInput as CreateCiiImportSchema } from '../types/cii.types'
import type { CiiImportDB, CiiReformulationLineDB, CiiImportWithLines } from '../types/cii.types'

// ============================================================
// createCiiImport — T-062
//
// Le fichier est lu côté client (File.text()) et transmis ici en texte brut —
// pas de passage par Supabase Storage, ce n'est pas un document à conserver
// tel quel mais une liste à parser. Le contenu brut est néanmoins gardé en
// base (raw_content) pour traçabilité.
// ============================================================

export async function createCiiImport(
  input: unknown
): Promise<ActionResponse<CiiImportWithLines>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return errorResponse('Non authentifié', 'UNAUTHORIZED')

    const parsed = CreateCiiImportSchema.safeParse(input)
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues[0]?.message ?? 'Données invalides',
        'VALIDATION_ERROR',
        parsed.error.issues
      )
    }

    const { clientId, clientProjectId, fileName, rawContent } = parsed.data

    const parsedLines = parseCiiFunctionsFile(rawContent)
    if (parsedLines.length === 0) {
      return errorResponse('Aucune fonction trouvée dans ce fichier', 'VALIDATION_ERROR')
    }

    const { data: importRow, error: importError } = await supabase
      .from('cii_imports')
      .insert({
        client_id: clientId,
        client_project_id: clientProjectId ?? null,
        file_name: fileName,
        raw_content: rawContent,
      })
      .select()
      .single()

    if (importError || !importRow) {
      console.error('[CII:CREATE_IMPORT] Insert import error:', importError)
      return errorResponse('Impossible de créer l\'import', 'CREATE_FAILED', importError)
    }

    const linesToInsert = parsedLines.map((line, index) => ({
      import_id: importRow.id,
      order_index: index,
      function_name: line.functionName,
      time_raw: line.timeRaw,
      time_days: line.timeDays,
    }))

    const { data: lineRows, error: linesError } = await supabase
      .from('cii_reformulation_lines')
      .insert(linesToInsert)
      .select()

    if (linesError || !lineRows) {
      console.error('[CII:CREATE_IMPORT] Insert lines error:', linesError)
      await supabase.from('cii_imports').delete().eq('id', importRow.id)
      return errorResponse('Impossible de créer les lignes', 'CREATE_FAILED', linesError)
    }

    const importData = toCamelCase(importRow as CiiImportDB) as unknown as Omit<CiiImportWithLines, 'lines'>
    const lines = (lineRows as CiiReformulationLineDB[])
      .map((row) => toCamelCase(row) as unknown as CiiImportWithLines['lines'][number])
      .sort((a, b) => a.orderIndex - b.orderIndex)

    return successResponse({ ...importData, lines })
  } catch (error) {
    console.error('[CII:CREATE_IMPORT] Unexpected error:', error)
    return errorResponse('Erreur interne', 'INTERNAL_ERROR', error)
  }
}

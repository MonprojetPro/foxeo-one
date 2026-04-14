'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { ShareDocumentsBatchInput, type ShareDocumentsBatchInput as BatchInput } from '../types/document.types'

interface BatchResult {
  count: number
  documentIds: string[]
}

export async function shareDocumentsBatch(input: BatchInput): Promise<ActionResponse<BatchResult>> {
  const parsed = ShareDocumentsBatchInput.safeParse(input)
  if (!parsed.success) {
    return errorResponse(
      parsed.error.issues[0]?.message ?? 'Données invalides',
      'VALIDATION_ERROR',
      parsed.error.issues
    )
  }

  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return errorResponse('Non authentifié', 'UNAUTHORIZED')

  const { data: operator } = await supabase
    .from('operators')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()
  if (!operator) return errorResponse('Accès refusé', 'FORBIDDEN')

  const { data, error } = await supabase
    .from('documents')
    .update({ visibility: 'shared', updated_at: new Date().toISOString() })
    .in('id', parsed.data.documentIds)
    .eq('client_id', parsed.data.clientId)
    .select('id')

  if (error) {
    console.error('[DOCUMENTS:BATCH_SHARE] DB error:', error)
    return errorResponse('Erreur lors du partage en lot', 'DB_ERROR', error)
  }

  const documentIds = (data ?? []).map((d: { id: string }) => d.id)
  console.info(`[DOCUMENTS:BATCH_SHARE] ${documentIds.length} documents partagés par operator ${operator.id}`)

  return successResponse({ count: documentIds.length, documentIds })
}

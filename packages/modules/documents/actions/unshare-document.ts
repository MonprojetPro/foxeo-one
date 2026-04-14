'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { UnshareDocumentInput, type Document, type DocumentDB } from '../types/document.types'
import { toDocument } from '../utils/to-document'

export async function unshareDocument(documentId: string): Promise<ActionResponse<Document>> {
  // Validate input
  const parsed = UnshareDocumentInput.safeParse({ documentId })
  if (!parsed.success) {
    return errorResponse('UUID de document invalide', 'VALIDATION_ERROR', parsed.error.issues)
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

  const { data: doc, error } = await supabase
    .from('documents')
    .update({ visibility: 'private', updated_at: new Date().toISOString() })
    .eq('id', documentId)
    .select()
    .single()

  if (error || !doc) return errorResponse('Document introuvable', 'NOT_FOUND', error)

  console.info(`[DOCUMENTS:UNSHARE] Document ${documentId} retiré par operator ${operator.id}`)
  return successResponse(toDocument(doc as DocumentDB))
}

'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { ShareDocumentInput, type Document, type DocumentDB } from '../types/document.types'
import { toDocument } from '../utils/to-document'

export async function shareDocument(documentId: string): Promise<ActionResponse<Document>> {
  // Validate input — defense-in-depth (UUID format check)
  const parsed = ShareDocumentInput.safeParse({ documentId })
  if (!parsed.success) {
    return errorResponse('UUID de document invalide', 'VALIDATION_ERROR', parsed.error.issues)
  }

  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return errorResponse('Non authentifié', 'UNAUTHORIZED')

  // Verify operator role — auth_user_id pattern from upload-document.ts
  const { data: operator } = await supabase
    .from('operators')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()
  if (!operator) return errorResponse('Accès refusé', 'FORBIDDEN')

  // Update visibility — RLS ensures operator only touches their clients' documents
  const { data: doc, error } = await supabase
    .from('documents')
    .update({ visibility: 'shared', updated_at: new Date().toISOString() })
    .eq('id', documentId)
    .select()
    .single()

  if (error || !doc) return errorResponse('Document introuvable', 'NOT_FOUND', error)

  // Log activity — fire-and-forget
  supabase.from('activity_logs').insert({
    actor_type: 'operator',
    actor_id: operator.id,
    action: 'document_shared',
    entity_type: 'client',
    entity_id: (doc as DocumentDB).client_id,
    metadata: { document_id: doc.id, document_name: (doc as DocumentDB).name },
  }).then(({ error: logError }) => {
    if (logError) console.error('[DOCUMENTS:SHARE] Activity log error:', logError)
  }).catch(() => {})

  // Fire-and-forget notification — inter-module via direct DB insert (architecture rule)
  supabase
    .from('notifications')
    .insert({
      client_id: (doc as DocumentDB).client_id,
      operator_id: operator.id,
      type: 'document_shared',
      title: 'Nouveau document partagé',
      message: `MiKL a partagé "${(doc as DocumentDB).name}" avec vous`,
      metadata: { documentId: doc.id },
      read: false,
    })
    .then(({ error: notifError }) => {
      if (notifError) console.error('[DOCUMENTS:SHARE] Notification insert failed:', notifError)
    })
    .catch((err: unknown) => console.error('[DOCUMENTS:SHARE] Notification error:', err))

  console.info(`[DOCUMENTS:SHARE] Document ${documentId} partagé par operator ${operator.id}`)
  return successResponse(toDocument(doc as DocumentDB))
}

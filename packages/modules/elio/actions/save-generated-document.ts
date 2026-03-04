'use server'

import { createServerSupabaseClient } from '@foxeo/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@foxeo/types'
import { toCamelCase } from '@foxeo/utils'

export interface SavedDocument {
  id: string
  clientId: string
  title: string
  content: string
  source: string
  createdAt: string
}

/**
 * Story 8.9b — Task 5
 * Server Action — Sauvegarde un document généré par Élio dans la table `documents`.
 * Crée le document avec source='elio_generated'.
 * Lie optionnellement au message Élio via metadata.document_id.
 */
export async function saveGeneratedDocument(
  clientId: string,
  title: string,
  content: string,
  conversationId?: string,
  messageId?: string
): Promise<ActionResponse<SavedDocument>> {
  if (!clientId || !title || !content) {
    return errorResponse('clientId, title et content requis', 'VALIDATION_ERROR')
  }

  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('documents')
    .insert({
      client_id: clientId,
      title,
      content,
      source: 'elio_generated',
      metadata: {
        conversation_id: conversationId ?? null,
        message_id: messageId ?? null,
      },
    })
    .select()
    .single()

  if (error) {
    return errorResponse('Erreur lors de la sauvegarde du document', 'DB_ERROR', error)
  }

  // Lier le document au message Élio via elio_messages.metadata.document_id
  // Utilise une requête RPC-style pour merger dans le JSONB existant sans écraser les autres champs
  if (messageId) {
    const { data: existingMsg } = await supabase
      .from('elio_messages')
      .select('metadata')
      .eq('id', messageId)
      .single()

    const mergedMetadata = { ...(existingMsg?.metadata as Record<string, unknown> ?? {}), document_id: data.id }

    const { error: updateError } = await supabase
      .from('elio_messages')
      .update({ metadata: mergedMetadata })
      .eq('id', messageId)

    if (updateError) {
      // Non bloquant — le document est sauvegardé même si la liaison échoue
      console.error(`[ELIO:SAVE_DOC] Failed to link document to message: ${updateError.message}`)
    }
  }

  const saved = toCamelCase(data) as unknown as SavedDocument
  return successResponse(saved)
}

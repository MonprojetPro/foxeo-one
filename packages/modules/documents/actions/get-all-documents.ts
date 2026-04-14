'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { toDocument } from '../utils/to-document'
import type { Document, DocumentDB } from '../types/document.types'

export interface DocumentWithClient extends Document {
  clientName: string
}

interface DocumentWithClientDB extends DocumentDB {
  clients: { name: string } | null
}

export async function getAllDocuments(): Promise<ActionResponse<DocumentWithClient[]>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return errorResponse('Non authentifié', 'UNAUTHORIZED')

    const { data: operator } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!operator) return errorResponse('Opérateur introuvable', 'NOT_FOUND')

    const { data, error } = await supabase
      .from('documents')
      .select('*, clients(name)')
      .eq('operator_id', operator.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) return errorResponse('Erreur chargement documents', 'DB_ERROR', { message: error.message, code: error.code })

    const docs = (data as DocumentWithClientDB[]).map((row) => ({
      ...toDocument(row),
      clientName: row.clients?.name ?? '—',
    }))

    return successResponse(docs)
  } catch (err) {
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR', { message: err instanceof Error ? err.message : String(err) })
  }
}

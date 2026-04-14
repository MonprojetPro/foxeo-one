'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { ClientDocument as ClientDocumentSchema } from '../types/crm.types'
import type { ClientDocument } from '../types/crm.types'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function getClientDocuments(
  clientId: string
): Promise<ActionResponse<ClientDocument[]>> {
  try {
    if (!clientId || !UUID_REGEX.test(clientId)) {
      return errorResponse('Identifiant client invalide', 'INVALID_INPUT')
    }

    const supabase = await createServerSupabaseClient()

    // Triple-layer security: verify authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    // Check if documents table exists
    const { error: tableCheckError } = await supabase
      .from('documents')
      .select('id')
      .limit(1)

    // If table doesn't exist yet (Epic 4), return empty array
    if (tableCheckError && tableCheckError.code === '42P01') {
      return successResponse([])
    }

    const { data, error } = await supabase
      .from('documents')
      .select(
        `
        id,
        client_id,
        name,
        type,
        url,
        visible_to_client,
        created_at,
        updated_at
      `
      )
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('[CRM:GET_CLIENT_DOCUMENTS] Supabase error:', error)
      return errorResponse(
        'Impossible de charger les documents',
        'DATABASE_ERROR',
        error
      )
    }

    if (!data) {
      return successResponse([])
    }

    // Transform snake_case DB fields to camelCase with Zod validation
    const documents: ClientDocument[] = data.map((doc) =>
      ClientDocumentSchema.parse({
        id: doc.id,
        clientId: doc.client_id,
        name: doc.name,
        type: doc.type,
        url: doc.url ?? undefined,
        visibleToClient: doc.visible_to_client,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
      })
    )

    return successResponse(documents)
  } catch (error) {
    console.error('[CRM:GET_CLIENT_DOCUMENTS] Unexpected error:', error)
    return errorResponse(
      'Une erreur inattendue est survenue',
      'INTERNAL_ERROR',
      error
    )
  }
}

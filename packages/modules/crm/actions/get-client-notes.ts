'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { toCamelCase } from '@monprojetpro/utils'
import type { ClientNote, ClientNoteDB } from '../types/crm.types'

export async function getClientNotes(
  clientId: string
): Promise<ActionResponse<ClientNote[]>> {
  try {
    const supabase = await createServerSupabaseClient()

    // Auth check
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    // Lookup operator record (operators.id ≠ auth.uid())
    const { data: operator, error: opError } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (opError || !operator) {
      return errorResponse('Opérateur non trouvé', 'NOT_FOUND')
    }

    const operatorId = operator.id

    // Fetch notes for this client and operator, ordered by most recent first
    const { data: notesData, error: fetchError } = await supabase
      .from('client_notes')
      .select('*')
      .eq('client_id', clientId)
      .eq('operator_id', operatorId)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('[CRM:GET_CLIENT_NOTES] Fetch error:', fetchError)
      return errorResponse(
        'Impossible de récupérer les notes',
        'FETCH_FAILED',
        fetchError
      )
    }

    // Transform snake_case → camelCase
    const notes = (notesData || []).map((note) =>
      toCamelCase<ClientNoteDB, ClientNote>(note as ClientNoteDB)
    )

    return successResponse(notes)
  } catch (error) {
    console.error('[CRM:GET_CLIENT_NOTES] Unexpected error:', error)
    return errorResponse(
      'Erreur interne',
      'INTERNAL_ERROR',
      error
    )
  }
}

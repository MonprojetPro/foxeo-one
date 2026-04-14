'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { toCamelCase } from '@monprojetpro/utils'
import type { ClientNote, CreateClientNoteInput, ClientNoteDB } from '../types/crm.types'
import { CreateClientNoteInput as CreateClientNoteSchema } from '../types/crm.types'

export async function createClientNote(
  input: CreateClientNoteInput
): Promise<ActionResponse<ClientNote>> {
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

    // Server-side validation
    const parsed = CreateClientNoteSchema.safeParse(input)
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues[0]?.message ?? 'Données invalides',
        'VALIDATION_ERROR',
        parsed.error.issues
      )
    }

    const { clientId, content } = parsed.data

    // Insert note
    const { data: noteData, error: insertError } = await supabase
      .from('client_notes')
      .insert({
        client_id: clientId,
        operator_id: operatorId,
        content,
      })
      .select()
      .single()

    if (insertError || !noteData) {
      console.error('[CRM:CREATE_NOTE] Insert error:', insertError)
      return errorResponse(
        'Impossible de créer la note',
        'CREATE_FAILED',
        insertError
      )
    }

    // Transform snake_case → camelCase
    const note = toCamelCase<ClientNoteDB, ClientNote>(noteData as ClientNoteDB)

    console.log(`[CRM:CREATE_NOTE] Note created for client ${clientId}`)

    return successResponse(note)
  } catch (error) {
    console.error('[CRM:CREATE_NOTE] Unexpected error:', error)
    return errorResponse(
      'Erreur interne',
      'INTERNAL_ERROR',
      error
    )
  }
}

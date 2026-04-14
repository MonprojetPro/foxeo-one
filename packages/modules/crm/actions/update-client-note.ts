'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { toCamelCase } from '@monprojetpro/utils'
import type { ClientNote, UpdateClientNoteInput, ClientNoteDB } from '../types/crm.types'
import { UpdateClientNoteInput as UpdateClientNoteSchema } from '../types/crm.types'

export async function updateClientNote(
  input: UpdateClientNoteInput
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
    const parsed = UpdateClientNoteSchema.safeParse(input)
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues[0]?.message ?? 'Données invalides',
        'VALIDATION_ERROR',
        parsed.error.issues
      )
    }

    const { noteId, content } = parsed.data

    // Update note (RLS ensures operator owns this note)
    const { data: noteData, error: updateError } = await supabase
      .from('client_notes')
      .update({ content })
      .eq('id', noteId)
      .eq('operator_id', operatorId) // Explicit check even though RLS enforces
      .select()
      .single()

    if (updateError || !noteData) {
      console.error('[CRM:UPDATE_NOTE] Update error:', updateError)
      return errorResponse(
        'Impossible de modifier la note',
        'UPDATE_FAILED',
        updateError
      )
    }

    // Transform snake_case → camelCase
    const note = toCamelCase<ClientNoteDB, ClientNote>(noteData as ClientNoteDB)

    console.log(`[CRM:UPDATE_NOTE] Note ${noteId} updated`)

    return successResponse(note)
  } catch (error) {
    console.error('[CRM:UPDATE_NOTE] Unexpected error:', error)
    return errorResponse(
      'Erreur interne',
      'INTERNAL_ERROR',
      error
    )
  }
}

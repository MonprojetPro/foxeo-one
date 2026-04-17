'use server'

import { assertOperator } from './assert-operator'
import { successResponse, errorResponse } from '@monprojetpro/types'
import type { ActionResponse } from '@monprojetpro/types'

export async function cancelReminder(
  reminderId: string
): Promise<ActionResponse<{ cancelled: boolean }>> {
  if (!reminderId) return errorResponse('reminderId requis', 'VALIDATION_ERROR')

  const { supabase, error: authError } = await assertOperator()
  if (authError || !supabase) return errorResponse(authError?.message ?? 'Non authentifié', authError?.code ?? 'UNAUTHORIZED')

  const { data: updated, error: updateError } = await supabase
    .from('collection_reminders')
    .update({ status: 'cancelled' })
    .eq('id', reminderId)
    .eq('status', 'pending')
    .select('id')
    .single()

  if (updateError) {
    return errorResponse('Erreur annulation relance', 'DB_ERROR', updateError)
  }

  if (!updated) {
    return errorResponse('Relance introuvable ou déjà traitée', 'NOT_FOUND')
  }

  return successResponse({ cancelled: true })
}

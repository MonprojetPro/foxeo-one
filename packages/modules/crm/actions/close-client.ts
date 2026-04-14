'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import type { CloseClientInput } from '../types/crm.types'
import { CloseClientInput as CloseClientInputSchema } from '../types/crm.types'

export async function closeClient(
  input: CloseClientInput
): Promise<ActionResponse<{ success: true }>> {
  try {
    // Server-side validation (FIRST)
    const parsed = CloseClientInputSchema.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'INVALID_INPUT', parsed.error.issues)
    }

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

    const { clientId, confirmName } = parsed.data

    // Check client exists, is owned by operator, and get name for validation
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, status, operator_id')
      .eq('id', clientId)
      .eq('operator_id', operatorId)
      .single()

    if (clientError) {
      // PGRST116 = no rows found by .single()
      if (clientError.code === 'PGRST116') {
        return errorResponse('Client introuvable', 'NOT_FOUND')
      }
      console.error('[CRM:CLOSE_CLIENT] Client check error:', clientError)
      return errorResponse(
        'Erreur lors de la vérification du client',
        'DATABASE_ERROR',
        clientError
      )
    }

    if (!client) {
      return errorResponse('Client introuvable', 'NOT_FOUND')
    }

    // Double validation: confirmName must match client.name (case-insensitive, trimmed)
    if (
      confirmName.trim().toLowerCase() !== client.name.trim().toLowerCase()
    ) {
      return errorResponse('Le nom saisi ne correspond pas', 'VALIDATION_ERROR')
    }

    // Check client is not already archived
    if (client.status === 'archived') {
      return errorResponse(
        'Le client est déjà clôturé',
        'INVALID_STATUS'
      )
    }

    // Close client: set status to archived and archived_at to NOW
    const now = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('clients')
      .update({
        status: 'archived',
        archived_at: now,
        updated_at: now,
      })
      .eq('id', clientId)
      .eq('operator_id', operatorId)

    if (updateError) {
      console.error('[CRM:CLOSE_CLIENT] Update error:', updateError)
      return errorResponse(
        'Erreur lors de la clôture du client',
        'DATABASE_ERROR',
        updateError
      )
    }

    // Log activity
    const { error: logError } = await supabase.from('activity_logs').insert({
      actor_type: 'operator',
      actor_id: operatorId,
      action: 'client_closed',
      entity_type: 'client',
      entity_id: clientId,
      metadata: {},
    })

    if (logError) {
      console.error('[CRM:CLOSE_CLIENT] Activity log error:', logError)
      // Don't fail the operation if logging fails
    }

    // Revalidate paths
    revalidatePath('/crm')
    revalidatePath(`/crm/clients/${clientId}`)

    return successResponse({ success: true })
  } catch (error) {
    console.error('[CRM:CLOSE_CLIENT] Unexpected error:', error)
    return errorResponse(
      'Une erreur inattendue est survenue',
      'INTERNAL_ERROR',
      error
    )
  }
}

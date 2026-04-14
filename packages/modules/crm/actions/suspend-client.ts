'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import type { SuspendClientInput } from '../types/crm.types'
import { SuspendClientInput as SuspendClientInputSchema } from '../types/crm.types'

export async function suspendClient(
  input: SuspendClientInput
): Promise<ActionResponse<{ success: true }>> {
  try {
    // Server-side validation (FIRST)
    const parsed = SuspendClientInputSchema.safeParse(input)
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

    const { clientId, reason } = parsed.data

    // Check client exists and is owned by operator
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, status, operator_id')
      .eq('id', clientId)
      .eq('operator_id', operatorId)
      .single()

    if (clientError) {
      console.error('[CRM:SUSPEND_CLIENT] Client check error:', clientError)
      return errorResponse(
        'Erreur lors de la vérification du client',
        'DATABASE_ERROR',
        clientError
      )
    }

    if (!client) {
      return errorResponse('Client introuvable', 'NOT_FOUND')
    }

    // Check client is not already suspended
    if (client.status === 'suspended') {
      return errorResponse(
        'Le client est déjà suspendu',
        'ALREADY_SUSPENDED'
      )
    }

    // Check client is active (can only suspend active clients)
    if (client.status !== 'active') {
      return errorResponse(
        'Seuls les clients actifs peuvent être suspendus',
        'INVALID_STATUS'
      )
    }

    // Suspend client
    const { error: updateError } = await supabase
      .from('clients')
      .update({
        status: 'suspended',
        suspended_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', clientId)
      .eq('operator_id', operatorId)

    if (updateError) {
      console.error('[CRM:SUSPEND_CLIENT] Update error:', updateError)
      return errorResponse(
        'Erreur lors de la suspension du client',
        'DATABASE_ERROR',
        updateError
      )
    }

    // Log activity
    const { error: logError } = await supabase.from('activity_logs').insert({
      actor_type: 'operator',
      actor_id: operatorId,
      action: 'client_suspended',
      entity_type: 'client',
      entity_id: clientId,
      metadata: { reason: reason || null },
    })

    if (logError) {
      console.error('[CRM:SUSPEND_CLIENT] Activity log error:', logError)
      // Don't fail the operation if logging fails
    }

    // Revalidate paths
    revalidatePath('/crm')
    revalidatePath(`/crm/clients/${clientId}`)

    return successResponse({ success: true })
  } catch (error) {
    console.error('[CRM:SUSPEND_CLIENT] Unexpected error:', error)
    return errorResponse(
      'Une erreur inattendue est survenue',
      'INTERNAL_ERROR',
      error
    )
  }
}

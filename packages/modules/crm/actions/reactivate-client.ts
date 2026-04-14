'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import type { ReactivateClientInput } from '../types/crm.types'
import { ReactivateClientInput as ReactivateClientInputSchema } from '../types/crm.types'

export async function reactivateClient(
  input: ReactivateClientInput
): Promise<ActionResponse<{ success: true }>> {
  try {
    // Server-side validation (FIRST)
    const parsed = ReactivateClientInputSchema.safeParse(input)
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

    const { clientId } = parsed.data

    // Check client exists and is owned by operator
    // Fetch retention_until and previous_status for archived-specific logic (Story 9.5c)
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, status, operator_id, retention_until, previous_status')
      .eq('id', clientId)
      .eq('operator_id', operatorId)
      .single()

    if (clientError) {
      // PGRST116 = no rows found by .single()
      if (clientError.code === 'PGRST116') {
        return errorResponse('Client introuvable', 'NOT_FOUND')
      }
      console.error('[CRM:REACTIVATE_CLIENT] Client check error:', clientError)
      return errorResponse(
        'Erreur lors de la vérification du client',
        'DATABASE_ERROR',
        clientError
      )
    }

    if (!client) {
      return errorResponse('Client introuvable', 'NOT_FOUND')
    }

    // Check client is suspended or archived (can only reactivate suspended/archived clients)
    if (client.status !== 'suspended' && client.status !== 'archived') {
      return errorResponse(
        'Seuls les clients suspendus ou clôturés peuvent être réactivés',
        'INVALID_STATUS'
      )
    }

    // Story 9.5c: For archived clients, check retention period has not expired
    if (client.status === 'archived' && client.retention_until) {
      const now = new Date()
      const retentionUntil = new Date(client.retention_until)
      if (retentionUntil <= now) {
        return errorResponse(
          'La période de rétention est expirée — les données ont été anonymisées',
          'CLIENT_DATA_PURGED'
        )
      }
    }

    // Determine target status: restore previous_status if available, fallback to 'active'
    const targetStatus = (client.previous_status as string | null) ?? 'active'

    // Reactivate client
    const now = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('clients')
      .update({
        status: targetStatus,
        suspended_at: null,
        archived_at: null,
        retention_until: null,
        previous_status: null,
        updated_at: now,
      })
      .eq('id', clientId)
      .eq('operator_id', operatorId)

    if (updateError) {
      console.error('[CRM:REACTIVATE_CLIENT] Update error:', updateError)
      return errorResponse(
        'Erreur lors de la réactivation du client',
        'DATABASE_ERROR',
        updateError
      )
    }

    // Log activity
    const { error: logError } = await supabase.from('activity_logs').insert({
      actor_type: 'operator',
      actor_id: operatorId,
      action: 'client_reactivated',
      entity_type: 'client',
      entity_id: clientId,
      metadata: {},
    })

    if (logError) {
      console.error('[CRM:REACTIVATE_CLIENT] Activity log error:', logError)
      // Don't fail the operation if logging fails
    }

    // Story 9.5c: Send notification to client on reactivation
    const { error: notifError } = await supabase.from('notifications').insert({
      recipient_type: 'client',
      recipient_id: clientId,
      type: 'system',
      title: 'Votre compte MonprojetPro a été réactivé',
      body: 'Votre accès à votre espace MonprojetPro a été rétabli. Bienvenue de retour !',
      link: null,
    })

    if (notifError) {
      console.error('[CRM:REACTIVATE_CLIENT] Notification error:', notifError)
      // Don't fail the operation if notification fails
    }

    // Revalidate paths
    revalidatePath('/crm')
    revalidatePath(`/crm/clients/${clientId}`)

    return successResponse({ success: true })
  } catch (error) {
    console.error('[CRM:REACTIVATE_CLIENT] Unexpected error:', error)
    return errorResponse(
      'Une erreur inattendue est survenue',
      'INTERNAL_ERROR',
      error
    )
  }
}

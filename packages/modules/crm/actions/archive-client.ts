'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import type { ArchiveClientInput } from '../types/crm.types'
import { ArchiveClientInput as ArchiveClientInputSchema } from '../types/crm.types'

export async function archiveClient(
  input: ArchiveClientInput
): Promise<ActionResponse<{ success: true }>> {
  try {
    // Server-side validation (FIRST)
    const parsed = ArchiveClientInputSchema.safeParse(input)
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

    const { clientId, retentionDays } = parsed.data

    // Check client exists and is owned by this operator
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, status, operator_id')
      .eq('id', clientId)
      .eq('operator_id', operator.id)
      .single()

    if (clientError) {
      if (clientError.code === 'PGRST116') {
        return errorResponse('Client introuvable', 'NOT_FOUND')
      }
      console.error('[CRM:ARCHIVE_CLIENT] Client check error:', clientError)
      return errorResponse(
        'Erreur lors de la vérification du client',
        'DATABASE_ERROR',
        clientError
      )
    }

    if (!client) {
      return errorResponse('Client introuvable', 'NOT_FOUND')
    }

    // Guard: already archived
    if (client.status === 'archived') {
      return errorResponse('Le client est déjà archivé', 'CLIENT_ALREADY_ARCHIVED')
    }

    // Guard: already deleted (anonymized)
    if (client.status === 'deleted') {
      return errorResponse('Le client a été supprimé et anonymisé', 'CLIENT_DELETED')
    }

    // Calculate retention_until
    const now = new Date()
    const retentionUntil = new Date(now)
    retentionUntil.setDate(retentionUntil.getDate() + retentionDays)

    // Archive: soft delete with retention period
    const { error: updateError } = await supabase
      .from('clients')
      .update({
        status: 'archived',
        archived_at: now.toISOString(),
        retention_until: retentionUntil.toISOString(),
        previous_status: client.status,
        updated_at: now.toISOString(),
      })
      .eq('id', clientId)
      .eq('operator_id', operator.id)

    if (updateError) {
      console.error('[CRM:ARCHIVE_CLIENT] Update error:', updateError)
      return errorResponse(
        "Erreur lors de l'archivage du client",
        'DATABASE_ERROR',
        updateError
      )
    }

    // Log activity
    const { error: logError } = await supabase.from('activity_logs').insert({
      actor_type: 'operator',
      actor_id: operator.id,
      action: 'client_archived',
      entity_type: 'client',
      entity_id: clientId,
      metadata: {
        retentionDays,
        retentionUntil: retentionUntil.toISOString(),
      },
    })

    if (logError) {
      console.error('[CRM:ARCHIVE_CLIENT] Activity log error:', logError)
      // Don't fail the operation if logging fails
    }

    // Revalidate paths
    revalidatePath('/crm')
    revalidatePath(`/crm/clients/${clientId}`)

    return successResponse({ success: true })
  } catch (error) {
    console.error('[CRM:ARCHIVE_CLIENT] Unexpected error:', error)
    return errorResponse(
      'Une erreur inattendue est survenue',
      'INTERNAL_ERROR',
      error
    )
  }
}

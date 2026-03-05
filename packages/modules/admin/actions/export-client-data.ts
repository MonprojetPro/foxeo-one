'use server'

import { createServerSupabaseClient } from '@foxeo/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@foxeo/types'
import { ExportClientDataInput, type ExportResult } from '../types/export.types'

export async function exportClientData(
  input: ExportClientDataInput
): Promise<ActionResponse<ExportResult>> {
  try {
    const parsed = ExportClientDataInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const { clientId, requestedBy } = parsed.data
    let requesterId: string

    if (requestedBy === 'client') {
      // Client exports their own data — verify auth_user_id matches
      const { data: clientRecord, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      if (clientError || !clientRecord) {
        return errorResponse('Client introuvable', 'NOT_FOUND')
      }

      if (clientRecord.id !== clientId) {
        return errorResponse(
          'Vous ne pouvez exporter que vos propres données',
          'UNAUTHORIZED'
        )
      }

      requesterId = user.id
    } else {
      // Operator exports on behalf of a client — verify operator owns client
      const { data: operator, error: opError } = await supabase
        .from('operators')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (opError || !operator) {
        return errorResponse('Opérateur introuvable', 'NOT_FOUND')
      }

      const { data: clientRecord, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('id', clientId)
        .eq('operator_id', operator.id)
        .maybeSingle()

      if (clientError || !clientRecord) {
        return errorResponse(
          "Vous n'êtes pas autorisé à exporter les données de ce client",
          'UNAUTHORIZED'
        )
      }

      requesterId = operator.id
    }

    // Guard: check for existing pending/processing export to prevent spam
    const { data: existingExport } = await supabase
      .from('data_exports')
      .select('id, status')
      .eq('client_id', clientId)
      .in('status', ['pending', 'processing'])
      .maybeSingle()

    if (existingExport) {
      return errorResponse(
        'Un export est déjà en cours pour ce client. Veuillez patienter.',
        'CONFLICT'
      )
    }

    // Create data_exports record with status 'pending'
    const { data: exportRecord, error: exportError } = await supabase
      .from('data_exports')
      .insert({
        client_id: clientId,
        requested_by: requestedBy,
        requester_id: requesterId,
        status: 'pending',
      })
      .select()
      .single()

    if (exportError || !exportRecord) {
      console.error('[ADMIN:EXPORT_CLIENT_DATA] Insert error:', exportError)
      return errorResponse(
        "Erreur lors de la création de l'export",
        'DATABASE_ERROR',
        exportError
      )
    }

    // Log activity
    const { error: logError } = await supabase.from('activity_logs').insert({
      actor_type: requestedBy === 'operator' ? 'operator' : 'client',
      actor_id: requesterId,
      action: 'data_export_requested',
      entity_type: 'client',
      entity_id: clientId,
      metadata: { export_id: exportRecord.id, requested_by: requestedBy },
    })

    if (logError) {
      console.error('[ADMIN:EXPORT_CLIENT_DATA] Activity log error:', logError)
    }

    // Trigger Edge Function asynchronously (fire & forget)
    const { error: fnError } = await supabase.functions.invoke(
      'generate-client-export',
      {
        body: { exportId: exportRecord.id, clientId, requestedBy },
      }
    )

    if (fnError) {
      console.error('[ADMIN:EXPORT_CLIENT_DATA] Edge Function invoke error:', fnError)
      // Don't fail — export record is created, background job can be retried
    }

    return successResponse({ exportId: exportRecord.id })
  } catch (error) {
    console.error('[ADMIN:EXPORT_CLIENT_DATA] Unexpected error:', error)
    return errorResponse(
      'Une erreur inattendue est survenue',
      'INTERNAL_ERROR',
      error
    )
  }
}

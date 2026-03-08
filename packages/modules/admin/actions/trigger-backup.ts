'use server'

import { createServerSupabaseClient } from '@foxeo/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@foxeo/types'

export interface TriggerBackupResult {
  triggered: boolean
}

export async function triggerManualBackup(): Promise<ActionResponse<TriggerBackupResult>> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const { data: operator, error: opError } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (opError || !operator) {
      return errorResponse('Accès réservé aux opérateurs', 'UNAUTHORIZED')
    }

    const { error: fnError } = await supabase.functions.invoke('backup-weekly', {
      body: { triggeredBy: 'manual', operatorId: operator.id },
    })

    if (fnError) {
      console.error('[ADMIN:TRIGGER_BACKUP] Edge Function invoke error:', fnError)
      return errorResponse('Erreur lors du déclenchement du backup', 'FUNCTION_ERROR', fnError)
    }

    // Activity log
    const { error: logError } = await supabase.from('activity_logs').insert({
      actor_type: 'operator',
      actor_id: operator.id,
      action: 'manual_backup_triggered',
      entity_type: 'system',
      entity_id: 'backup',
      metadata: { triggeredBy: operator.id },
    })

    if (logError) {
      console.error('[ADMIN:TRIGGER_BACKUP] Activity log error:', logError)
    }

    return successResponse({ triggered: true })
  } catch (error) {
    console.error('[ADMIN:TRIGGER_BACKUP] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}

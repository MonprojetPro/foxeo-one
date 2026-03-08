'use server'

import { createServerSupabaseClient } from '@foxeo/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@foxeo/types'
import { z } from 'zod'

const ToggleMaintenanceInput = z.object({
  enabled: z.boolean(),
  message: z.string().min(1).max(500),
  estimatedDuration: z.string().nullable().optional(),
})

type ToggleMaintenanceInput = z.infer<typeof ToggleMaintenanceInput>

export interface MaintenanceToggleResult {
  enabled: boolean
}

export async function toggleMaintenanceMode(
  input: ToggleMaintenanceInput
): Promise<ActionResponse<MaintenanceToggleResult>> {
  try {
    const parsed = ToggleMaintenanceInput.safeParse(input)
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

    // Verify operator
    const { data: operator, error: opError } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (opError || !operator) {
      return errorResponse('Accès réservé aux opérateurs', 'UNAUTHORIZED')
    }

    const { enabled, message, estimatedDuration } = parsed.data

    // UPSERT maintenance_mode
    const { error: modeError } = await supabase
      .from('system_config')
      .upsert({ key: 'maintenance_mode', value: enabled }, { onConflict: 'key' })

    if (modeError) {
      console.error('[ADMIN:TOGGLE_MAINTENANCE] upsert maintenance_mode error:', modeError)
      return errorResponse('Erreur lors de la mise à jour du mode maintenance', 'DATABASE_ERROR', modeError)
    }

    // UPSERT maintenance_message
    const { error: msgError } = await supabase
      .from('system_config')
      .upsert({ key: 'maintenance_message', value: message }, { onConflict: 'key' })

    if (msgError) {
      console.error('[ADMIN:TOGGLE_MAINTENANCE] upsert maintenance_message error:', msgError)
      return errorResponse('Erreur lors de la mise à jour du message', 'DATABASE_ERROR', msgError)
    }

    // UPSERT maintenance_estimated_duration
    const { error: durError } = await supabase
      .from('system_config')
      .upsert(
        { key: 'maintenance_estimated_duration', value: estimatedDuration ?? null },
        { onConflict: 'key' }
      )

    if (durError) {
      console.error('[ADMIN:TOGGLE_MAINTENANCE] upsert estimated_duration error:', durError)
      // Non-fatal
    }

    // Activity log
    const { error: logError } = await supabase.from('activity_logs').insert({
      actor_type: 'operator',
      actor_id: operator.id,
      action: 'maintenance_toggled',
      entity_type: 'system',
      entity_id: 'maintenance',
      metadata: { enabled, message, estimatedDuration: estimatedDuration ?? null },
    })

    if (logError) {
      console.error('[ADMIN:TOGGLE_MAINTENANCE] activity log error:', logError)
    }

    return successResponse({ enabled })
  } catch (error) {
    console.error('[ADMIN:TOGGLE_MAINTENANCE] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}

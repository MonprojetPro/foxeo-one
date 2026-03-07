'use server'

import { z } from 'zod'
import { createServerSupabaseClient } from '@foxeo/supabase'
import { errorResponse, successResponse, type ActionResponse } from '@foxeo/types'

const LOCKED_MODULES = ['core-dashboard', 'chat', 'documents', 'elio'] as const

const UpdateActiveModulesSchema = z.object({
  clientId: z.string().uuid('ID client invalide'),
  moduleId: z.string().min(1, 'moduleId requis'),
  enabled: z.boolean(),
})

export async function updateActiveModules(
  clientId: string,
  moduleId: string,
  enabled: boolean,
): Promise<ActionResponse<null>> {
  const parsed = UpdateActiveModulesSchema.safeParse({ clientId, moduleId, enabled })
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
    return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
  }

  // Guard : modules de base non désactivables
  if (!enabled && (LOCKED_MODULES as readonly string[]).includes(moduleId)) {
    return errorResponse(
      `Le module "${moduleId}" est inclus dans l'offre de base et ne peut pas être désactivé`,
      'MODULE_LOCKED',
    )
  }

  try {
    const supabase = await createServerSupabaseClient()

    // Auth
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    // Lookup operator
    const { data: operator, error: opError } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (opError || !operator) {
      return errorResponse('Opérateur non trouvé', 'NOT_FOUND')
    }

    // Check client belongs to operator
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, operator_id')
      .eq('id', clientId)
      .eq('operator_id', operator.id)
      .single()

    if (clientError || !client) {
      return errorResponse('Client introuvable', 'NOT_FOUND')
    }

    // Fetch current active_modules
    const { data: config, error: configError } = await supabase
      .from('client_configs')
      .select('id, active_modules')
      .eq('client_id', clientId)
      .single()

    if (configError || !config) {
      return errorResponse('Configuration client introuvable', 'NOT_FOUND')
    }

    const currentModules: string[] = Array.isArray(config.active_modules) ? config.active_modules : []

    // Dédupliquer : array_remove puis append si enabled, array_remove si disabled
    let newModules: string[]
    if (enabled) {
      // Remove duplicates first, then add
      newModules = [...currentModules.filter((m) => m !== moduleId), moduleId]
    } else {
      newModules = currentModules.filter((m) => m !== moduleId)
    }

    const { error: updateError } = await supabase
      .from('client_configs')
      .update({ active_modules: newModules })
      .eq('id', config.id)

    if (updateError) {
      console.error('[CRM:UPDATE_ACTIVE_MODULES] Update error:', updateError)
      return errorResponse('Erreur lors de la mise à jour des modules', 'DATABASE_ERROR', updateError)
    }

    // Log activity
    const { error: logError } = await supabase.from('activity_logs').insert({
      actor_type: 'operator',
      actor_id: operator.id,
      action: 'module_toggled',
      entity_type: 'client',
      entity_id: clientId,
      metadata: {
        moduleId,
        enabled,
        clientName: client.name,
      },
    })

    if (logError) {
      console.error('[CRM:UPDATE_ACTIVE_MODULES] Activity log error:', logError)
      // Non-fatal
    }

    return successResponse(null)
  } catch (error) {
    console.error('[CRM:UPDATE_ACTIVE_MODULES] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}

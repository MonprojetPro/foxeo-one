'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'

export async function deleteModuleCatalog(
  moduleId: string
): Promise<ActionResponse<{ deleted: boolean }>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return errorResponse('Non authentifié', 'UNAUTHORIZED')

    const { data: operator } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()
    if (!operator) return errorResponse('Accès réservé aux opérateurs', 'UNAUTHORIZED')

    // Get the module first to check kind
    const { data: mod } = await supabase
      .from('module_catalog')
      .select('module_key, kind')
      .eq('id', moduleId)
      .single()

    if (!mod) {
      return errorResponse('Module introuvable', 'NOT_FOUND')
    }

    if (mod.kind === 'catalog') {
      return errorResponse(
        'Les modules du catalogue ne peuvent pas être supprimés, seulement désactivés',
        'FORBIDDEN'
      )
    }

    // Check if any module depends on this one
    const { data: dependents } = await supabase
      .from('module_catalog')
      .select('module_key')
      .contains('requires_modules', [mod.module_key])

    if (dependents && dependents.length > 0) {
      const depKeys = dependents.map(d => d.module_key).join(', ')
      return errorResponse(
        `Impossible de supprimer : requis par ${depKeys}`,
        'MODULE_REQUIRED_BY_OTHER'
      )
    }

    const { error } = await supabase
      .from('module_catalog')
      .delete()
      .eq('id', moduleId)

    if (error) {
      console.error('[ADMIN:DELETE_MODULE_CATALOG] Error:', error)
      return errorResponse('Erreur lors de la suppression', 'DATABASE_ERROR')
    }

    await supabase.from('activity_logs').insert({
      actor_type: 'operator',
      actor_id: operator.id,
      action: 'module_catalog_deleted',
      entity_type: 'module_catalog',
      entity_id: moduleId,
      metadata: { module_key: mod.module_key },
    })

    return successResponse({ deleted: true })
  } catch (error) {
    console.error('[ADMIN:DELETE_MODULE_CATALOG] Unexpected error:', error)
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR')
  }
}

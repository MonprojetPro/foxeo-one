'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'

export interface ToggleClientModuleResult {
  enabled?: string
  disabled?: string
  cascaded: string[]
}

/**
 * Active ou desactive un module pour un client.
 * Gere les dependances en cascade (activation) et le blocage (desactivation).
 */
export async function toggleClientModule(
  clientId: string,
  moduleKey: string,
  enable: boolean
): Promise<ActionResponse<ToggleClientModuleResult>> {
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

    // Get current active modules
    const { data: config, error: configError } = await supabase
      .from('client_configs')
      .select('active_modules')
      .eq('client_id', clientId)
      .single()

    if (configError || !config) {
      return errorResponse('Configuration client introuvable', 'NOT_FOUND')
    }

    const currentModules: string[] = config.active_modules ?? []

    // Get the target module from catalog
    const { data: targetModule } = await supabase
      .from('module_catalog')
      .select('module_key, is_default, requires_modules')
      .eq('module_key', moduleKey)
      .eq('is_active', true)
      .single()

    if (!targetModule) {
      return errorResponse(`Module "${moduleKey}" introuvable ou inactif`, 'NOT_FOUND')
    }

    if (enable) {
      // --- ACTIVATION ---
      if (currentModules.includes(moduleKey)) {
        return successResponse({ enabled: moduleKey, cascaded: [] })
      }

      // Resolve cascade: activate required modules not yet active
      const cascaded: string[] = []
      const toActivate = new Set<string>([moduleKey])

      const resolveDeps = async (keys: string[]): Promise<string[] | null> => {
        if (keys.length === 0) return []

        const { data: deps } = await supabase
          .from('module_catalog')
          .select('module_key, requires_modules')
          .in('module_key', keys)
          .eq('is_active', true)

        if (!deps) return null

        const nextLevel: string[] = []
        for (const dep of deps) {
          const reqs = (dep.requires_modules as string[]) ?? []
          for (const req of reqs) {
            if (!currentModules.includes(req) && !toActivate.has(req)) {
              toActivate.add(req)
              cascaded.push(req)
              nextLevel.push(req)
            }
          }
        }
        return nextLevel
      }

      // Level 1: deps of the target module
      const requiresModules = (targetModule.requires_modules as string[]) ?? []
      for (const req of requiresModules) {
        if (!currentModules.includes(req)) {
          toActivate.add(req)
          cascaded.push(req)
        }
      }

      // Level 2: deps of the cascaded modules (max depth = 2)
      if (cascaded.length > 0) {
        await resolveDeps(cascaded)
      }

      const newModules = [...new Set([...currentModules, ...Array.from(toActivate)])]

      const { error: updateError } = await supabase
        .from('client_configs')
        .update({ active_modules: newModules })
        .eq('client_id', clientId)

      if (updateError) {
        console.error('[ADMIN:TOGGLE_CLIENT_MODULE] Update error:', updateError)
        return errorResponse('Erreur de mise à jour', 'DATABASE_ERROR')
      }

      await supabase.from('activity_logs').insert({
        actor_type: 'operator',
        actor_id: operator.id,
        action: 'client_module_enabled',
        entity_type: 'client',
        entity_id: clientId,
        metadata: { module_key: moduleKey, cascaded },
      })

      return successResponse({ enabled: moduleKey, cascaded })
    } else {
      // --- DESACTIVATION ---
      if (!currentModules.includes(moduleKey)) {
        return successResponse({ disabled: moduleKey, cascaded: [] })
      }

      // Check is_default
      if (targetModule.is_default) {
        return errorResponse(
          `Le module "${moduleKey}" fait partie du One de base et ne peut pas être retiré`,
          'MODULE_IS_DEFAULT'
        )
      }

      // Check if other active modules depend on this one
      const { data: allModules } = await supabase
        .from('module_catalog')
        .select('module_key, requires_modules')
        .in('module_key', currentModules)

      if (allModules) {
        for (const mod of allModules) {
          const reqs = (mod.requires_modules as string[]) ?? []
          if (reqs.includes(moduleKey) && mod.module_key !== moduleKey) {
            return errorResponse(
              `Impossible de désactiver "${moduleKey}" : requis par "${mod.module_key}"`,
              'MODULE_REQUIRED_BY_OTHER'
            )
          }
        }
      }

      const newModules = currentModules.filter(k => k !== moduleKey)

      const { error: updateError } = await supabase
        .from('client_configs')
        .update({ active_modules: newModules })
        .eq('client_id', clientId)

      if (updateError) {
        console.error('[ADMIN:TOGGLE_CLIENT_MODULE] Update error:', updateError)
        return errorResponse('Erreur de mise à jour', 'DATABASE_ERROR')
      }

      await supabase.from('activity_logs').insert({
        actor_type: 'operator',
        actor_id: operator.id,
        action: 'client_module_disabled',
        entity_type: 'client',
        entity_id: clientId,
        metadata: { module_key: moduleKey },
      })

      return successResponse({ disabled: moduleKey, cascaded: [] })
    }
  } catch (error) {
    console.error('[ADMIN:TOGGLE_CLIENT_MODULE] Unexpected error:', error)
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR')
  }
}

'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'

export interface ApplyConfigResult {
  applied: string[]
  cascaded: string[]
}

/**
 * Remplace atomiquement la liste des modules actifs d'un client.
 * Injecte automatiquement les dependances et les modules par defaut.
 */
export async function applyClientModuleConfig(
  clientId: string,
  moduleKeys: string[]
): Promise<ActionResponse<ApplyConfigResult>> {
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

    // Get all catalog entries
    const { data: catalog, error: catError } = await supabase
      .from('module_catalog')
      .select('module_key, is_default, requires_modules, is_active')

    if (catError || !catalog) {
      return errorResponse('Erreur de chargement du catalogue', 'DATABASE_ERROR')
    }

    const catalogMap = new Map(catalog.map(c => [c.module_key, c]))

    // Ensure all requested modules exist and are active
    for (const key of moduleKeys) {
      const entry = catalogMap.get(key)
      if (!entry) {
        return errorResponse(`Module "${key}" introuvable dans le catalogue`, 'NOT_FOUND')
      }
      if (!entry.is_active) {
        return errorResponse(`Module "${key}" est désactivé dans le catalogue`, 'MODULE_INACTIVE')
      }
    }

    // Build final set: requested + defaults + cascaded dependencies
    const finalSet = new Set(moduleKeys)
    const cascaded: string[] = []

    // Add defaults
    for (const entry of catalog) {
      if (entry.is_default && !finalSet.has(entry.module_key)) {
        finalSet.add(entry.module_key)
        cascaded.push(entry.module_key)
      }
    }

    // Resolve dependencies (2 passes for max depth 2)
    for (let pass = 0; pass < 2; pass++) {
      for (const key of Array.from(finalSet)) {
        const entry = catalogMap.get(key)
        if (!entry) continue
        const reqs = (entry.requires_modules as string[]) ?? []
        for (const req of reqs) {
          if (!finalSet.has(req)) {
            finalSet.add(req)
            cascaded.push(req)
          }
        }
      }
    }

    const finalModules = Array.from(finalSet)

    // Atomic update via RPC
    const { error: rpcError } = await supabase.rpc('apply_client_module_config', {
      p_client_id: clientId,
      p_module_keys: finalModules,
    })

    if (rpcError) {
      console.error('[ADMIN:APPLY_CLIENT_MODULE_CONFIG] RPC error:', rpcError)
      return errorResponse('Erreur lors de la mise à jour atomique', 'DATABASE_ERROR')
    }

    await supabase.from('activity_logs').insert({
      actor_type: 'operator',
      actor_id: operator.id,
      action: 'client_modules_applied',
      entity_type: 'client',
      entity_id: clientId,
      metadata: { modules: finalModules, cascaded },
    })

    return successResponse({ applied: finalModules, cascaded })
  } catch (error) {
    console.error('[ADMIN:APPLY_CLIENT_MODULE_CONFIG] Unexpected error:', error)
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR')
  }
}

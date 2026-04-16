'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { z } from 'zod'

const UpsertModuleCatalogInput = z.object({
  id: z.string().uuid().optional(),
  module_key: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'module_key doit être en kebab-case'),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  category: z.enum(['business', 'communication', 'integration']),
  kind: z.enum(['catalog', 'custom']),
  setup_price_ht: z.number().min(0).default(0),
  monthly_price_ht: z.number().min(0).nullable().optional(),
  is_default: z.boolean().default(false),
  is_active: z.boolean().default(true),
  requires_modules: z.array(z.string()).default([]),
  manifest_path: z.string().nullable().optional(),
})

export type UpsertModuleCatalogInput = z.infer<typeof UpsertModuleCatalogInput>

export async function upsertModuleCatalog(
  input: UpsertModuleCatalogInput
): Promise<ActionResponse<{ id: string; module_key: string }>> {
  try {
    const parsed = UpsertModuleCatalogInput.safeParse(input)
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message ?? 'Données invalides', 'VALIDATION_ERROR')
    }

    const supabase = await createServerSupabaseClient()

    // Verify operator
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return errorResponse('Non authentifié', 'UNAUTHORIZED')

    const { data: operator } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()
    if (!operator) return errorResponse('Accès réservé aux opérateurs', 'UNAUTHORIZED')

    const { id, requires_modules, ...rest } = parsed.data

    // Validate requires_modules: no self-reference, no cycles, all exist
    if (requires_modules.length > 0) {
      if (requires_modules.includes(rest.module_key)) {
        return errorResponse('Un module ne peut pas dépendre de lui-même', 'VALIDATION_ERROR')
      }

      const { data: deps } = await supabase
        .from('module_catalog')
        .select('module_key, requires_modules')
        .in('module_key', requires_modules)

      if (!deps || deps.length !== requires_modules.length) {
        const found = new Set(deps?.map(d => d.module_key) ?? [])
        const missing = requires_modules.filter(k => !found.has(k))
        return errorResponse(`Modules dépendants introuvables : ${missing.join(', ')}`, 'VALIDATION_ERROR')
      }

      // Check 2-level depth: deps of deps must not reference this module
      for (const dep of deps) {
        const depReqs = (dep.requires_modules as string[]) ?? []
        if (depReqs.includes(rest.module_key)) {
          return errorResponse(
            `Dépendance cyclique détectée : ${dep.module_key} dépend déjà de ${rest.module_key}`,
            'VALIDATION_ERROR'
          )
        }
      }
    }

    const record = { ...rest, requires_modules }

    let result
    if (id) {
      // Update
      const { data, error } = await supabase
        .from('module_catalog')
        .update(record)
        .eq('id', id)
        .select('id, module_key')
        .single()
      result = { data, error }
    } else {
      // Insert
      const { data, error } = await supabase
        .from('module_catalog')
        .insert(record)
        .select('id, module_key')
        .single()
      result = { data, error }
    }

    if (result.error) {
      console.error('[ADMIN:UPSERT_MODULE_CATALOG] Error:', result.error)
      if (result.error.code === '23505') {
        return errorResponse(`Le module_key "${rest.module_key}" existe déjà`, 'DUPLICATE_KEY')
      }
      return errorResponse('Erreur lors de la sauvegarde', 'DATABASE_ERROR')
    }

    // Activity log
    await supabase.from('activity_logs').insert({
      actor_type: 'operator',
      actor_id: operator.id,
      action: id ? 'module_catalog_updated' : 'module_catalog_created',
      entity_type: 'module_catalog',
      entity_id: result.data!.id,
      metadata: { module_key: rest.module_key, kind: rest.kind },
    })

    return successResponse(result.data!)
  } catch (error) {
    console.error('[ADMIN:UPSERT_MODULE_CATALOG] Unexpected error:', error)
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR')
  }
}

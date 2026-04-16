'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'

/** Manifests connus du monorepo — source de verite code */
const KNOWN_MANIFESTS: Array<{
  module_key: string
  name: string
  category: string
  manifest_path: string
}> = [
  { module_key: 'core-dashboard', name: 'Dashboard', category: 'business', manifest_path: 'packages/modules/core-dashboard/manifest.ts' },
  { module_key: 'chat', name: 'Chat', category: 'communication', manifest_path: 'packages/modules/chat/manifest.ts' },
  { module_key: 'documents', name: 'Documents', category: 'business', manifest_path: 'packages/modules/documents/manifest.ts' },
  { module_key: 'elio', name: 'Élio — Assistant IA', category: 'integration', manifest_path: 'packages/modules/elio/manifest.ts' },
  { module_key: 'crm', name: 'CRM', category: 'business', manifest_path: 'packages/modules/crm/manifest.ts' },
  { module_key: 'facturation', name: 'Comptabilité', category: 'business', manifest_path: 'packages/modules/facturation/manifest.ts' },
  { module_key: 'visio', name: 'Visioconférence', category: 'communication', manifest_path: 'packages/modules/visio/manifest.ts' },
  { module_key: 'email', name: 'Email', category: 'communication', manifest_path: 'packages/modules/email/manifest.ts' },
  { module_key: 'validation-hub', name: 'Validation Hub', category: 'business', manifest_path: 'packages/modules/validation-hub/manifest.ts' },
  { module_key: 'analytics', name: 'Analytics', category: 'business', manifest_path: 'packages/modules/analytics/manifest.ts' },
  { module_key: 'templates', name: 'Templates', category: 'business', manifest_path: 'packages/modules/templates/manifest.ts' },
  { module_key: 'notifications', name: 'Notifications', category: 'integration', manifest_path: 'packages/modules/notifications/manifest.ts' },
  { module_key: 'parcours', name: 'Parcours Lab', category: 'business', manifest_path: 'packages/modules/parcours/manifest.ts' },
  { module_key: 'support', name: 'Support', category: 'communication', manifest_path: 'packages/modules/support/manifest.ts' },
  { module_key: 'admin', name: 'Administration', category: 'integration', manifest_path: 'packages/modules/admin/manifest.ts' },
]

export interface SyncResult {
  added: string[]
  orphaned: string[]
  unchanged: number
}

/**
 * Synchronise le catalogue DB avec les manifests du monorepo.
 * - Ajoute les nouveaux modules (kind='catalog')
 * - Marque is_active=false les modules catalog dont le manifest n'existe plus
 * - Ne touche pas aux modules custom
 */
export async function syncModuleCatalogFromManifests(): Promise<ActionResponse<SyncResult>> {
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

    // Get existing catalog entries
    const { data: existing, error } = await supabase
      .from('module_catalog')
      .select('module_key, kind')

    if (error) {
      return errorResponse('Erreur de chargement', 'DATABASE_ERROR')
    }

    const existingKeys = new Set((existing ?? []).map(e => e.module_key))
    const manifestKeys = new Set(KNOWN_MANIFESTS.map(m => m.module_key))

    // Add new modules from manifests
    const added: string[] = []
    for (const manifest of KNOWN_MANIFESTS) {
      if (!existingKeys.has(manifest.module_key)) {
        const { error: insertError } = await supabase
          .from('module_catalog')
          .insert({
            module_key: manifest.module_key,
            name: manifest.name,
            description: null,
            category: manifest.category,
            kind: 'catalog',
            manifest_path: manifest.manifest_path,
          })

        if (!insertError) {
          added.push(manifest.module_key)
        }
      }
    }

    // Mark orphaned catalog modules as inactive
    const orphaned: string[] = []
    for (const entry of existing ?? []) {
      if (entry.kind === 'catalog' && !manifestKeys.has(entry.module_key)) {
        await supabase
          .from('module_catalog')
          .update({ is_active: false })
          .eq('module_key', entry.module_key)
        orphaned.push(entry.module_key)
      }
    }

    const unchanged = existingKeys.size - orphaned.length

    await supabase.from('activity_logs').insert({
      actor_type: 'operator',
      actor_id: operator.id,
      action: 'module_catalog_synced',
      entity_type: 'system',
      entity_id: 'module_catalog',
      metadata: { added, orphaned, unchanged },
    })

    return successResponse({ added, orphaned, unchanged })
  } catch (error) {
    console.error('[ADMIN:SYNC_MODULE_CATALOG] Unexpected error:', error)
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR')
  }
}

import type { SupabaseClient } from '@supabase/supabase-js'
import type { GraduationTier, GraduationResult } from '../types/graduation.types'
import type { ActionResponse } from '@foxeo/types'
import { errorResponse, successResponse } from '@foxeo/types'

export type ProvisionInstanceInput = {
  clientId: string
  companyName: string
  tier: GraduationTier
  modules: string[]
}

/**
 * MVP Stub: Provisions a One instance for a graduated client.
 *
 * NOTE: Full implementation (Supabase project creation, DB migrations,
 * Vercel deployment, health check) is Story 12.6.
 * For MVP, creates client_instances entry with status='active' immediately.
 */
export async function provisionOneInstance(
  supabase: SupabaseClient,
  input: ProvisionInstanceInput
): Promise<ActionResponse<GraduationResult>> {
  const { clientId, companyName, tier, modules } = input

  // Generate unique slug from company name (kebab-case)
  const baseSlug = companyName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)

  // Check for slug uniqueness, append suffix if needed
  const slug = await resolveUniqueSlug(supabase, baseSlug)

  if (!slug) {
    return errorResponse(
      'Impossible de générer un slug unique pour cette instance',
      'SLUG_GENERATION_ERROR'
    )
  }

  const instanceUrl = `https://${slug}.foxeo.io`

  // MVP: Insert directly as 'active' (Story 12.6 will do actual provisioning)
  const { data: instance, error: insertError } = await supabase
    .from('client_instances')
    .insert({
      client_id: clientId,
      instance_url: instanceUrl,
      slug,
      status: 'active',
      tier,
      active_modules: modules,
      activated_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (insertError || !instance) {
    console.error('[ADMIN:PROVISION_INSTANCE] Insert error:', insertError)
    return errorResponse(
      'Erreur lors de la création de l\'instance',
      'PROVISION_ERROR',
      insertError
    )
  }

  return successResponse({
    clientId,
    instanceId: instance.id,
    status: 'active' as const,
    instanceUrl,
    slug,
  })
}

async function resolveUniqueSlug(
  supabase: SupabaseClient,
  baseSlug: string
): Promise<string | null> {
  // Try base slug first
  const { data: existing } = await supabase
    .from('client_instances')
    .select('slug')
    .eq('slug', baseSlug)
    .maybeSingle()

  if (!existing) return baseSlug

  // Try up to 99 suffixes
  for (let i = 2; i <= 99; i++) {
    const candidate = `${baseSlug}-${i}`
    const { data: taken } = await supabase
      .from('client_instances')
      .select('slug')
      .eq('slug', candidate)
      .maybeSingle()

    if (!taken) return candidate
  }

  return null
}

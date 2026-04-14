'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'

export type ClientInstanceStatus = 'provisioning' | 'active' | 'suspended' | 'failed' | 'transferred'

export type ClientInstance = {
  id: string
  clientId: string
  instanceUrl: string
  slug: string
  status: ClientInstanceStatus
  tier: string
  activeModules: string[]
  createdAt: string
  activatedAt: string | null
  transferredAt: string | null
}

export async function getClientInstance(
  clientId: string
): Promise<ActionResponse<ClientInstance | null>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('client_instances')
      .select('id, client_id, instance_url, slug, status, tier, active_modules, created_at, activated_at, transferred_at')
      .eq('client_id', clientId)
      .maybeSingle()

    if (error) {
      console.error('[CRM:GET_CLIENT_INSTANCE] Error:', error)
      return errorResponse('Erreur lors du chargement de l\'instance', 'DATABASE_ERROR', error)
    }

    if (!data) {
      return successResponse(null)
    }

    return successResponse({
      id: data.id,
      clientId: data.client_id,
      instanceUrl: data.instance_url,
      slug: data.slug,
      status: data.status as ClientInstanceStatus,
      tier: data.tier,
      activeModules: data.active_modules,
      createdAt: data.created_at,
      activatedAt: data.activated_at,
      transferredAt: data.transferred_at,
    })
  } catch (err) {
    console.error('[CRM:GET_CLIENT_INSTANCE] Unexpected error:', err)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', err)
  }
}

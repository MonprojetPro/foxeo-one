'use server'

import { createServerSupabaseClient } from '@foxeo/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@foxeo/types'
import { Client as ClientSchema } from '../types/crm.types'
import type { Client } from '../types/crm.types'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function getClient(clientId: string): Promise<ActionResponse<Client>> {
  try {
    if (!clientId || !UUID_REGEX.test(clientId)) {
      return errorResponse('Identifiant client invalide', 'INVALID_INPUT')
    }

    const supabase = await createServerSupabaseClient()

    // Triple-layer security: verify authenticated user at Server Action level
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    // Lookup operator record (operators.id ≠ auth.uid())
    const { data: operator, error: opError } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (opError || !operator) {
      return errorResponse('Opérateur non trouvé', 'NOT_FOUND')
    }

    const operatorId = operator.id

    const { data, error } = await supabase
      .from('clients')
      .select(
        `
        id,
        operator_id,
        name,
        company,
        email,
        client_type,
        status,
        sector,
        phone,
        website,
        notes,
        created_at,
        updated_at,
        client_configs (
          active_modules,
          dashboard_type,
          theme_variant,
          parcours_config,
          subscription_tier,
          tier_changed_at
        )
      `
      )
      .eq('operator_id', operatorId)
      .eq('id', clientId)
      .single()

    if (error) {
      // Distinguish between NOT_FOUND and DATABASE_ERROR
      if (error.code === 'PGRST116') {
        return errorResponse(
          'Client introuvable',
          'NOT_FOUND',
          error
        )
      }

      console.error('[CRM:GET_CLIENT] Supabase error:', error)
      return errorResponse(
        'Impossible de charger le client',
        'DATABASE_ERROR',
        error
      )
    }

    if (!data) {
      return errorResponse('Client introuvable', 'NOT_FOUND')
    }

    // Transform snake_case DB fields to camelCase with Zod validation at boundary
    // client_configs is a 1:1 relation, Supabase returns it as single object or null
    const configRaw = (data as Record<string, unknown>).client_configs as Record<string, unknown> | null

    const client: Client = ClientSchema.parse({
      id: data.id,
      operatorId: data.operator_id,
      name: data.name,
      company: data.company,
      email: data.email,
      clientType: data.client_type,
      status: data.status,
      sector: data.sector ?? undefined,
      phone: data.phone ?? undefined,
      website: data.website ?? undefined,
      notes: data.notes ?? undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      config: configRaw
        ? {
            activeModules: (configRaw.active_modules as string[]) ?? [],
            dashboardType: configRaw.dashboard_type as string,
            themeVariant: configRaw.theme_variant as string | null,
            parcoursConfig: configRaw.parcours_config as Record<string, unknown> | undefined,
            subscriptionTier: (configRaw.subscription_tier as 'base' | 'essentiel' | 'agentique' | null) ?? null,
            tierChangedAt: (configRaw.tier_changed_at as string | null) ?? null,
          }
        : undefined,
    })

    return successResponse(client)
  } catch (error) {
    console.error('[CRM:GET_CLIENT] Unexpected error:', error)
    return errorResponse(
      'Une erreur inattendue est survenue',
      'INTERNAL_ERROR',
      error
    )
  }
}

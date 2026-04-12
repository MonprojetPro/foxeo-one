'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { ClientListItem as ClientListItemSchema } from '../types/crm.types'
import type { ClientListItem, ClientFilters } from '../types/crm.types'

export async function getClients(
  filters?: ClientFilters
): Promise<ActionResponse<ClientListItem[]>> {
  try {
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

    // Build query
    let query = supabase
      .from('clients')
      .select(
        `
        id,
        operator_id,
        first_name,
        name,
        company,
        email,
        sector,
        client_type,
        status,
        created_at,
        is_pinned,
        deferred_until,
        archived_at,
        retention_until,
        hub_seen_at,
        prospect_stage,
        project_type,
        lead_message
      `
      )
      .eq('operator_id', operatorId)

    // Apply filters if provided
    const hasStatusFilter = filters?.status && filters.status.length > 0
    if (hasStatusFilter) {
      // If specific statuses are requested, filter by those statuses
      query = query.in('status', filters.status)
    } else {
      // Exclude deleted (anonymized) clients by default — never visible in UI
      // Prospects, archived, suspended, active clients are all visible
      query = query.neq('status', 'deleted')
    }

    if (filters?.clientType && filters.clientType.length > 0) {
      query = query.in('client_type', filters.clientType)
    }

    const { data, error } = await query
      .order('is_pinned', { ascending: false }) // Pinned first
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) {
      console.error('[CRM:GET_CLIENTS] Supabase error:', error)
      return errorResponse(
        'Impossible de charger les clients',
        'DATABASE_ERROR',
        error
      )
    }

    if (!data) {
      return successResponse([])
    }

    // Transform snake_case DB fields to camelCase with Zod validation at boundary
    const clients: ClientListItem[] = data.map((client) =>
      ClientListItemSchema.parse({
        id: client.id,
        firstName: client.first_name ?? undefined,
        name: client.name,
        company: client.company,
        email: client.email ?? undefined,
        sector: client.sector ?? undefined,
        clientType: client.client_type,
        status: client.status,
        createdAt: client.created_at,
        isPinned: client.is_pinned ?? false,
        deferredUntil: client.deferred_until ?? null,
        archivedAt: client.archived_at ?? null,
        retentionUntil: client.retention_until ?? null,
        hubSeenAt: client.hub_seen_at ?? null,
        prospectStage: client.prospect_stage ?? null,
        projectType: client.project_type ?? null,
        leadMessage: client.lead_message ?? null,
      })
    )

    return successResponse(clients)
  } catch (error) {
    console.error('[CRM:GET_CLIENTS] Unexpected error:', error)
    return errorResponse(
      'Une erreur inattendue est survenue',
      'INTERNAL_ERROR',
      error
    )
  }
}

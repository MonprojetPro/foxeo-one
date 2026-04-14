'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { ClientTimeEstimate as ClientTimeEstimateSchema } from '../types/crm.types'
import type { ClientTimeEstimate } from '../types/crm.types'
import { TIME_ESTIMATES } from '../utils/time-estimates'

const RELEVANT_EVENT_TYPES = [
  'message_sent',
  'validation_approved',
  'validation_rejected',
  'visio_completed',
] as const

export async function getTimePerClient(): Promise<ActionResponse<ClientTimeEstimate[]>> {
  try {
    const supabase = await createServerSupabaseClient()

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

    // Step 1: Get all clients for this operator
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, company, client_type, status')
      .eq('operator_id', operatorId)

    if (clientsError) {
      console.error('[CRM:GET_TIME_PER_CLIENT] Supabase error:', clientsError)
      return errorResponse(
        'Impossible de charger les clients',
        'DATABASE_ERROR',
        clientsError
      )
    }

    if (!clients || clients.length === 0) {
      return successResponse([])
    }

    const clientIds = clients.map((c) => c.id)

    // Step 2: Get relevant activity logs for these clients
    const { data: logs, error: logsError } = await supabase
      .from('activity_logs')
      .select('client_id, event_type, event_data, created_at')
      .in('client_id', clientIds)
      .in('event_type', [...RELEVANT_EVENT_TYPES])
      .order('created_at', { ascending: false })
      // TODO: Migrate to supabase.rpc() SQL aggregate when dataset grows (>1000 clients)
      // Current approach fetches individual rows — acceptable for <100 clients
      .limit(10000)

    if (logsError) {
      console.error('[CRM:GET_TIME_PER_CLIENT] Supabase error:', logsError)
      return errorResponse(
        'Impossible de charger les activités',
        'DATABASE_ERROR',
        logsError
      )
    }

    const activityLogs = logs ?? []

    // Step 3: Aggregate per client
    const aggregation = new Map<string, {
      messageCount: number
      validationCount: number
      visioSeconds: number
      lastActivity: string | null
    }>()

    // Initialize all clients with zero counts
    for (const client of clients) {
      aggregation.set(client.id, {
        messageCount: 0,
        validationCount: 0,
        visioSeconds: 0,
        lastActivity: null,
      })
    }

    // Process activity logs
    for (const log of activityLogs) {
      const agg = aggregation.get(log.client_id)
      if (!agg) continue

      // Track last activity (logs are ordered DESC, so first seen is latest)
      if (!agg.lastActivity) {
        agg.lastActivity = log.created_at
      }

      switch (log.event_type) {
        case 'message_sent':
          agg.messageCount++
          break
        case 'validation_approved':
        case 'validation_rejected':
          agg.validationCount++
          break
        case 'visio_completed': {
          const eventData = log.event_data as Record<string, unknown> | null
          const durationSeconds = eventData?.duration_seconds
          if (typeof durationSeconds === 'number') {
            agg.visioSeconds += durationSeconds
          }
          break
        }
      }
    }

    // Step 4: Build result with time estimates
    const estimates: ClientTimeEstimate[] = clients.map((client) => {
      const agg = aggregation.get(client.id)!
      const totalEstimatedSeconds =
        agg.messageCount * TIME_ESTIMATES.message +
        agg.validationCount * TIME_ESTIMATES.validation +
        agg.visioSeconds

      return ClientTimeEstimateSchema.parse({
        clientId: client.id,
        clientName: client.name,
        clientCompany: client.company,
        clientType: client.client_type,
        messageCount: agg.messageCount,
        validationCount: agg.validationCount,
        visioSeconds: agg.visioSeconds,
        totalEstimatedSeconds,
        lastActivity: agg.lastActivity,
      })
    })

    // Sort by total time DESC (most time spent first)
    estimates.sort((a, b) => b.totalEstimatedSeconds - a.totalEstimatedSeconds)

    return successResponse(estimates)
  } catch (error) {
    console.error('[CRM:GET_TIME_PER_CLIENT] Unexpected error:', error)
    return errorResponse(
      'Une erreur inattendue est survenue',
      'INTERNAL_ERROR',
      error
    )
  }
}

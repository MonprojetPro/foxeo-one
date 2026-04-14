'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { GraduationRate as GraduationRateSchema } from '../types/crm.types'
import type { GraduationRate } from '../types/crm.types'

export async function getGraduationRate(): Promise<ActionResponse<GraduationRate>> {
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

    // Step 1: Get all Lab (complet) client IDs for this operator
    const { data: labClients, error: clientsError } = await supabase
      .from('clients')
      .select('id')
      .eq('operator_id', operatorId)
      .eq('client_type', 'complet')

    if (clientsError) {
      console.error('[CRM:GET_GRADUATION_RATE] Supabase error:', clientsError)
      return errorResponse(
        'Impossible de charger les clients Lab',
        'DATABASE_ERROR',
        clientsError
      )
    }

    const totalLabClients = labClients?.length ?? 0

    if (totalLabClients === 0) {
      const rate = GraduationRateSchema.parse({
        percentage: 0,
        graduated: 0,
        totalLabClients: 0,
      })
      return successResponse(rate)
    }

    const clientIds = labClients!.map((c) => c.id)

    // Step 2: Count graduation events for these clients via client_id
    const { data: graduationLogs, error: logsError } = await supabase
      .from('activity_logs')
      .select('id, client_id')
      .eq('event_type', 'graduated_to_one')
      .in('client_id', clientIds)

    if (logsError) {
      console.error('[CRM:GET_GRADUATION_RATE] Supabase error:', logsError)
      return errorResponse(
        'Impossible de charger le taux de graduation',
        'DATABASE_ERROR',
        logsError
      )
    }

    const graduated = graduationLogs?.length ?? 0
    const percentage = Math.round((graduated / totalLabClients) * 100)

    const rate = GraduationRateSchema.parse({
      percentage,
      graduated,
      totalLabClients,
    })

    return successResponse(rate)
  } catch (error) {
    console.error('[CRM:GET_GRADUATION_RATE] Unexpected error:', error)
    return errorResponse(
      'Une erreur inattendue est survenue',
      'INTERNAL_ERROR',
      error
    )
  }
}

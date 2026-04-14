'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import type {
  ValidationRequest,
  ValidationRequestStatus,
  ValidationRequestType,
  ClientSummary,
  ValidationQueueFilters,
} from '../types/validation.types'

type ValidationRequestRow = {
  id: string
  client_id: string
  operator_id: string
  parcours_id: string | null
  step_id: string | null
  type: string
  title: string
  content: string
  document_ids: string[]
  status: string
  reviewer_comment: string | null
  submitted_at: string
  reviewed_at: string | null
  created_at: string
  updated_at: string
  clients: {
    id: string
    name: string
    company: string | null
    client_type: string
    avatar_url: string | null
  } | null
}

export async function getValidationRequests(
  filters?: Partial<ValidationQueueFilters>
): Promise<ActionResponse<ValidationRequest[]>> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const { data: operator, error: opError } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (opError || !operator) {
      return errorResponse('Opérateur non trouvé', 'NOT_FOUND')
    }

    let query = supabase
      .from('validation_requests')
      .select(
        `
        id,
        client_id,
        operator_id,
        parcours_id,
        step_id,
        type,
        title,
        content,
        document_ids,
        status,
        reviewer_comment,
        submitted_at,
        reviewed_at,
        created_at,
        updated_at,
        clients:client_id (
          id,
          name,
          company,
          client_type,
          avatar_url
        )
      `
      )
      .eq('operator_id', operator.id)

    // Apply status filter
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    // Apply type filter
    if (filters?.type && filters.type !== 'all') {
      query = query.eq('type', filters.type)
    }

    // Apply sort
    const sortBy = filters?.sortBy ?? 'submitted_at'
    const ascending = (filters?.sortOrder ?? 'asc') === 'asc'

    if (sortBy === 'submitted_at') {
      query = query.order('submitted_at', { ascending })
    }

    const { data, error } = await query.limit(500)

    if (error) {
      console.error('[VALIDATION-HUB:GET_REQUESTS] Supabase error:', error)
      return errorResponse(
        'Impossible de charger les demandes',
        'DATABASE_ERROR',
        error
      )
    }

    if (!data) {
      return successResponse([])
    }

    const rows = data as ValidationRequestRow[]
    const requests: ValidationRequest[] = rows.map(
      (row) => {
        const clientData = row.clients

        const client: ClientSummary | undefined = clientData
          ? {
              id: clientData.id,
              name: clientData.name,
              company: clientData.company,
              clientType: clientData.client_type,
              avatarUrl: clientData.avatar_url,
            }
          : undefined

        return {
          id: row.id,
          clientId: row.client_id,
          operatorId: row.operator_id,
          parcoursId: row.parcours_id,
          stepId: row.step_id,
          type: row.type as ValidationRequestType,
          title: row.title,
          content: row.content,
          documentIds: row.document_ids ?? [],
          status: row.status as ValidationRequestStatus,
          reviewerComment: row.reviewer_comment,
          submittedAt: row.submitted_at,
          reviewedAt: row.reviewed_at,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          client,
        }
      }
    )

    return successResponse(requests)
  } catch (error) {
    console.error('[VALIDATION-HUB:GET_REQUESTS] Unexpected error:', error)
    return errorResponse(
      'Une erreur inattendue est survenue',
      'INTERNAL_ERROR',
      error
    )
  }
}

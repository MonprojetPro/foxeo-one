'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import type {
  ValidationRequestType,
  ValidationRequestStatus,
  ClientDetail,
  ParcoursDetail,
  DocumentSummary,
  ValidationRequestDetail,
} from '../types/validation.types'

type ClientRow = {
  id: string
  name: string
  company: string | null
  client_type: string
  avatar_url: string | null
}

type ParcoursRow = {
  id: string
  template_id: string | null
  parcours_templates: { name: string } | null
}

type ParcoursStepRow = {
  step_number: number
  title: string
  status: string
}

type DocumentRow = {
  id: string
  name: string
  file_type: string
  file_size: number
  file_path: string
}

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
  clients: ClientRow | null
}

export async function getValidationRequest(
  requestId: string
): Promise<ActionResponse<ValidationRequestDetail>> {
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

    // Fetch main request with client join
    const { data: row, error: reqError } = await supabase
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
      .eq('id', requestId)
      .eq('operator_id', operator.id)
      .single()

    if (reqError) {
      console.error('[VALIDATION-HUB:GET_REQUEST] Supabase error:', reqError)
      if (reqError.code === 'PGRST116') {
        return errorResponse('Demande introuvable', 'NOT_FOUND')
      }
      return errorResponse(
        'Impossible de charger la demande',
        'DATABASE_ERROR',
        reqError
      )
    }

    if (!row) {
      return errorResponse('Demande introuvable', 'NOT_FOUND')
    }

    const reqRow = row as ValidationRequestRow
    const clientData = reqRow.clients

    if (!clientData) {
      return errorResponse('Client introuvable', 'NOT_FOUND')
    }

    const client: ClientDetail = {
      id: clientData.id,
      name: clientData.name,
      company: clientData.company,
      clientType: clientData.client_type,
      avatarUrl: clientData.avatar_url,
    }

    // Fetch parcours details if parcours_id is set
    let parcours: ParcoursDetail | undefined

    if (reqRow.parcours_id) {
      const { data: parcoursRow } = await supabase
        .from('parcours')
        .select(
          `
          id,
          template_id,
          parcours_templates:template_id (
            name
          )
        `
        )
        .eq('id', reqRow.parcours_id)
        .single()

      if (parcoursRow) {
        const pRow = parcoursRow as unknown as ParcoursRow

        // Get steps info
        const { data: stepsData } = await supabase
          .from('parcours_steps')
          .select('step_number, title, status')
          .eq('parcours_id', reqRow.parcours_id)
          .order('step_number', { ascending: true })

        const steps = (stepsData ?? []) as ParcoursStepRow[]
        const currentStep = steps.find((s) => s.status === 'current')
        const completedSteps = steps.filter(
          (s) => s.status === 'completed'
        ).length

        parcours = {
          id: pRow.id,
          name: pRow.parcours_templates?.name ?? 'Parcours Lab',
          currentStepNumber: currentStep?.step_number ?? null,
          currentStepTitle: currentStep?.title ?? null,
          totalSteps: steps.length,
          completedSteps,
        }
      }
    }

    // Fetch documents if document_ids is not empty
    const documentIds = reqRow.document_ids ?? []
    let documents: DocumentSummary[] = []

    if (documentIds.length > 0) {
      const { data: docsData } = await supabase
        .from('documents')
        .select('id, name, file_type, file_size, file_path')
        .in('id', documentIds)

      if (docsData) {
        documents = (docsData as DocumentRow[]).map((doc) => ({
          id: doc.id,
          name: doc.name,
          fileType: doc.file_type,
          fileSize: doc.file_size,
          filePath: doc.file_path,
        }))
      }
    }

    const detail: ValidationRequestDetail = {
      id: reqRow.id,
      clientId: reqRow.client_id,
      operatorId: reqRow.operator_id,
      parcoursId: reqRow.parcours_id,
      stepId: reqRow.step_id,
      type: reqRow.type as ValidationRequestType,
      title: reqRow.title,
      content: reqRow.content,
      documentIds: reqRow.document_ids ?? [],
      status: reqRow.status as ValidationRequestStatus,
      reviewerComment: reqRow.reviewer_comment,
      submittedAt: reqRow.submitted_at,
      reviewedAt: reqRow.reviewed_at,
      createdAt: reqRow.created_at,
      updatedAt: reqRow.updated_at,
      client,
      parcours,
      documents,
    }

    return successResponse(detail)
  } catch (error) {
    console.error('[VALIDATION-HUB:GET_REQUEST] Unexpected error:', error)
    return errorResponse(
      'Une erreur inattendue est survenue',
      'INTERNAL_ERROR',
      error
    )
  }
}

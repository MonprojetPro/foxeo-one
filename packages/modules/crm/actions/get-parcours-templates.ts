'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { ParcoursTemplate as ParcoursTemplateSchema } from '../types/crm.types'
import type { ParcoursTemplate } from '../types/crm.types'

export async function getParcoursTemplates(): Promise<ActionResponse<ParcoursTemplate[]>> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const { data, error } = await supabase
      .from('parcours_templates')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[CRM:GET_PARCOURS_TEMPLATES] Supabase error:', error)
      return errorResponse(
        'Impossible de charger les templates de parcours',
        'DATABASE_ERROR',
        error
      )
    }

    if (!data) {
      return successResponse([])
    }

    const templates: ParcoursTemplate[] = data.map((row) =>
      ParcoursTemplateSchema.parse({
        id: row.id,
        operatorId: row.operator_id,
        name: row.name,
        description: row.description,
        parcoursType: row.parcours_type,
        stages: row.stages,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })
    )

    return successResponse(templates)
  } catch (error) {
    console.error('[CRM:GET_PARCOURS_TEMPLATES] Unexpected error:', error)
    return errorResponse(
      'Une erreur inattendue est survenue',
      'INTERNAL_ERROR',
      error
    )
  }
}

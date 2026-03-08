'use server'

import { createServerSupabaseClient } from '@foxeo/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@foxeo/types'
import { z } from 'zod'

// ============================================================
// Types
// ============================================================

const StageSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().default(''),
  order: z.number().int().min(1),
  active_by_default: z.boolean().optional().default(true),
  elio_prompts: z.string().optional().default(''),
})

const SaveParcourTemplateSchema = z.object({
  templateId: z.string().uuid().optional(),
  name: z.string().min(1, 'Le nom est requis'),
  description: z.string().optional().default(''),
  parcours_type: z.enum(['complet', 'partiel', 'ponctuel']).default('complet'),
  stages: z.array(StageSchema).min(2, 'Un template doit avoir au minimum 2 étapes'),
})

type SaveParcourTemplateInput = z.infer<typeof SaveParcourTemplateSchema>

export interface ParcourTemplate {
  id: string
  operatorId: string
  name: string
  description: string | null
  parcoursType: 'complet' | 'partiel' | 'ponctuel'
  stages: Stage[]
  isActive: boolean
  clientCount: number
  createdAt: string
  updatedAt: string
}

export interface Stage {
  key: string
  name: string
  description: string
  order: number
  active_by_default: boolean
  elio_prompts: string
}

// ============================================================
// assertOperator helper
// ============================================================

async function assertOperator() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { supabase: null, userId: null, error: errorResponse('Non authentifié', 'UNAUTHORIZED') }
  }
  const { data: operator } = await supabase
    .from('operators')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()
  if (!operator) {
    return { supabase: null, userId: null, error: errorResponse('Accès réservé aux opérateurs', 'FORBIDDEN') }
  }
  return { supabase, operatorId: operator.id, userId: user.id, error: null }
}

// ============================================================
// saveParcourTemplate — UPSERT
// ============================================================

export async function saveParcourTemplate(
  input: SaveParcourTemplateInput
): Promise<ActionResponse<ParcourTemplate>> {
  try {
    const parsed = SaveParcourTemplateSchema.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { supabase, operatorId, error: authErr } = await assertOperator()
    if (authErr || !supabase || !operatorId) {
      return authErr ?? errorResponse('Erreur auth', 'UNAUTHORIZED')
    }

    const { templateId, name, description, parcours_type, stages } = parsed.data

    const payload = {
      operator_id: operatorId,
      name,
      description: description ?? '',
      parcours_type,
      stages: stages as unknown as Record<string, unknown>[],
      is_active: true,
    }

    let row: Record<string, unknown>

    if (templateId) {
      // Update
      const { data, error } = await supabase
        .from('parcours_templates')
        .update(payload)
        .eq('id', templateId)
        .eq('operator_id', operatorId)
        .select('id, operator_id, name, description, parcours_type, stages, is_active, created_at, updated_at')
        .single()
      if (error || !data) {
        console.error('[TEMPLATES:SAVE_PARCOUR] update error:', error)
        return errorResponse('Erreur lors de la mise à jour du template', 'DATABASE_ERROR', error)
      }
      row = data as Record<string, unknown>
    } else {
      // Insert
      const { data, error } = await supabase
        .from('parcours_templates')
        .insert(payload)
        .select('id, operator_id, name, description, parcours_type, stages, is_active, created_at, updated_at')
        .single()
      if (error || !data) {
        console.error('[TEMPLATES:SAVE_PARCOUR] insert error:', error)
        return errorResponse('Erreur lors de la création du template', 'DATABASE_ERROR', error)
      }
      row = data as Record<string, unknown>
    }

    return successResponse(mapToParcourTemplate(row, 0))
  } catch (error) {
    console.error('[TEMPLATES:SAVE_PARCOUR] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}

// ============================================================
// duplicateParcourTemplate
// ============================================================

export async function duplicateParcourTemplate(
  templateId: string
): Promise<ActionResponse<ParcourTemplate>> {
  try {
    const { supabase, operatorId, error: authErr } = await assertOperator()
    if (authErr || !supabase || !operatorId) {
      return authErr ?? errorResponse('Erreur auth', 'UNAUTHORIZED')
    }

    const { data: original, error: fetchError } = await supabase
      .from('parcours_templates')
      .select('name, description, parcours_type, stages')
      .eq('id', templateId)
      .eq('operator_id', operatorId)
      .single()

    if (fetchError || !original) {
      return errorResponse('Template introuvable', 'NOT_FOUND')
    }

    const { data, error } = await supabase
      .from('parcours_templates')
      .insert({
        operator_id: operatorId,
        name: `[Copie] ${original.name}`,
        description: original.description,
        parcours_type: original.parcours_type,
        stages: original.stages,
        is_active: true,
      })
      .select('id, operator_id, name, description, parcours_type, stages, is_active, created_at, updated_at')
      .single()

    if (error || !data) {
      console.error('[TEMPLATES:DUPLICATE_PARCOUR] insert error:', error)
      return errorResponse('Erreur lors de la duplication', 'DATABASE_ERROR', error)
    }

    return successResponse(mapToParcourTemplate(data as Record<string, unknown>, 0))
  } catch (error) {
    console.error('[TEMPLATES:DUPLICATE_PARCOUR] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}

// ============================================================
// archiveParcourTemplate — soft delete (is_active = false)
// ============================================================

export async function archiveParcourTemplate(
  templateId: string
): Promise<ActionResponse<{ id: string }>> {
  try {
    const { supabase, operatorId, error: authErr } = await assertOperator()
    if (authErr || !supabase || !operatorId) {
      return authErr ?? errorResponse('Erreur auth', 'UNAUTHORIZED')
    }

    const { error } = await supabase
      .from('parcours_templates')
      .update({ is_active: false })
      .eq('id', templateId)
      .eq('operator_id', operatorId)

    if (error) {
      console.error('[TEMPLATES:ARCHIVE_PARCOUR] update error:', error)
      return errorResponse('Erreur lors de l\'archivage', 'DATABASE_ERROR', error)
    }

    return successResponse({ id: templateId })
  } catch (error) {
    console.error('[TEMPLATES:ARCHIVE_PARCOUR] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}

// ============================================================
// Mapper
// ============================================================

function mapToParcourTemplate(row: Record<string, unknown>, clientCount: number): ParcourTemplate {
  return {
    id: row.id as string,
    operatorId: row.operator_id as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    parcoursType: row.parcours_type as 'complet' | 'partiel' | 'ponctuel',
    stages: (row.stages as Stage[]) ?? [],
    isActive: row.is_active as boolean,
    clientCount,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

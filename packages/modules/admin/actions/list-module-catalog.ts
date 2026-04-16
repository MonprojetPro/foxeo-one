'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'

export interface ModuleCatalogEntry {
  id: string
  module_key: string
  name: string
  description: string | null
  category: string
  kind: 'catalog' | 'custom'
  setup_price_ht: number
  monthly_price_ht: number | null
  is_default: boolean
  is_active: boolean
  requires_modules: string[]
  manifest_path: string | null
  created_at: string
  updated_at: string
}

export interface ListModuleCatalogFilters {
  category?: string
  kind?: 'catalog' | 'custom'
  isActive?: boolean
}

export async function listModuleCatalog(
  filters?: ListModuleCatalogFilters
): Promise<ActionResponse<ModuleCatalogEntry[]>> {
  try {
    const supabase = await createServerSupabaseClient()

    // Defense-in-depth: verify operator
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return errorResponse('Non authentifié', 'UNAUTHORIZED')

    const { data: operator } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()
    if (!operator) return errorResponse('Accès réservé aux opérateurs', 'UNAUTHORIZED')

    let query = supabase
      .from('module_catalog')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (filters?.category) {
      query = query.eq('category', filters.category)
    }
    if (filters?.kind) {
      query = query.eq('kind', filters.kind)
    }
    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive)
    }

    const { data, error } = await query

    if (error) {
      console.error('[ADMIN:LIST_MODULE_CATALOG] Error:', error)
      return errorResponse('Erreur lors du chargement du catalogue', 'DATABASE_ERROR')
    }

    return successResponse(data as ModuleCatalogEntry[])
  } catch (error) {
    console.error('[ADMIN:LIST_MODULE_CATALOG] Unexpected error:', error)
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR')
  }
}

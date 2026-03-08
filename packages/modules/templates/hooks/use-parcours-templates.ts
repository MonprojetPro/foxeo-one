import { useQuery } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@foxeo/supabase'
import type { ParcourTemplate } from '../actions/save-parcours-template'

export function useParcourTemplates() {
  return useQuery({
    queryKey: ['parcours-templates'],
    queryFn: async (): Promise<ParcourTemplate[]> => {
      const supabase = createBrowserSupabaseClient()

      const { data, error } = await supabase
        .from('parcours_templates')
        .select('id, operator_id, name, description, parcours_type, stages, is_active, created_at, updated_at, parcours:parcours(id)')
        .order('created_at', { ascending: false })

      if (error) throw error

      return (data ?? []).map((row) => ({
        id: row.id,
        operatorId: row.operator_id,
        name: row.name,
        description: row.description ?? null,
        parcoursType: row.parcours_type as 'complet' | 'partiel' | 'ponctuel',
        stages: (row.stages ?? []) as ParcourTemplate['stages'],
        isActive: row.is_active,
        clientCount: Array.isArray(row.parcours) ? row.parcours.length : 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
    },
  })
}

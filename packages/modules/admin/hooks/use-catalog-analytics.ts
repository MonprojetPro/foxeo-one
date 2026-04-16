'use client'

import { useQuery } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@monprojetpro/supabase'

export interface CatalogAnalyticsEntry {
  id: string
  module_key: string
  name: string
  kind: 'catalog' | 'custom'
  category: string
  setup_price_ht: number
  monthly_price_ht: number | null
  is_default: boolean
  is_active: boolean
  active_clients_count: number
  total_setup_revenue: number
  estimated_yearly_recurring_revenue: number
  estimated_first_year_revenue: number
}

export function useCatalogAnalytics() {
  return useQuery({
    queryKey: ['catalog-analytics'],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient()
      const { data, error } = await supabase
        .from('v_module_catalog_analytics')
        .select('*')
        .order('active_clients_count', { ascending: false })

      if (error) throw new Error(error.message)
      return data as CatalogAnalyticsEntry[]
    },
  })
}

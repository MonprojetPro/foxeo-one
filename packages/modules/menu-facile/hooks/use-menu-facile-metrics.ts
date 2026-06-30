import { useQuery } from '@tanstack/react-query'
import { getMenuFacileMetrics } from '../actions/get-metrics'
import type { MenuFacileMetrics } from '../types'

/**
 * Charge les métriques MenuFacile via la Server Action (qui appelle le guichet).
 * Pattern Hub : TanStack Query = source de vérité pour la donnée serveur.
 */
export function useMenuFacileMetrics() {
  return useQuery<MenuFacileMetrics>({
    queryKey: ['menu-facile', 'metrics'],
    queryFn: async (): Promise<MenuFacileMetrics> => {
      const res = await getMenuFacileMetrics()
      if (res.error || !res.data) {
        throw new Error(res.error?.message ?? 'Erreur lors du chargement des métriques MenuFacile')
      }
      return res.data
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

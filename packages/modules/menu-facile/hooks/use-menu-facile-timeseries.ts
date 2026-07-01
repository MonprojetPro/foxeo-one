import { useQuery } from '@tanstack/react-query'
import { getMenuFacileTimeseries } from '../actions/get-timeseries'
import type { MenuFacileTimeseries } from '../types'

/**
 * Charge la série temporelle MenuFacile (graphiques) via la Server Action.
 * `days` fait partie de la queryKey → change de fenêtre = nouveau cache.
 */
export function useMenuFacileTimeseries(days = 30) {
  return useQuery<MenuFacileTimeseries>({
    queryKey: ['menu-facile', 'timeseries', days],
    queryFn: async (): Promise<MenuFacileTimeseries> => {
      const res = await getMenuFacileTimeseries(days)
      if (res.error || !res.data) {
        throw new Error(res.error?.message ?? 'Erreur lors du chargement des séries MenuFacile')
      }
      return res.data
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000, // moins fréquent que les métriques (données journalières)
  })
}

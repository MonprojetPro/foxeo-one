import { useQuery } from '@tanstack/react-query'
import { getHouseholdsDistribution, getRetentionCohorts } from '../actions/get-insights'
import type { HouseholdsDistribution, RetentionCohorts } from '../types'

/**
 * Ces deux vues sont des agrégats lourds côté guichet : on les rafraîchit
 * beaucoup moins souvent que les compteurs, et on ne réessaie pas — si
 * l'endpoint n'existe pas encore, inutile de le rappeler trois fois.
 */
const AGGREGATE_OPTIONS = {
  retry: false,
  staleTime: 15 * 60 * 1000,
  refetchInterval: 15 * 60 * 1000,
  refetchOnWindowFocus: false,
} as const

export function useHouseholdsDistribution() {
  return useQuery<HouseholdsDistribution>({
    queryKey: ['menu-facile', 'households-distribution'],
    queryFn: async (): Promise<HouseholdsDistribution> => {
      const res = await getHouseholdsDistribution()
      if (res.error || !res.data) {
        throw new Error(res.error?.message ?? 'Répartition indisponible')
      }
      return res.data
    },
    ...AGGREGATE_OPTIONS,
  })
}

export function useRetentionCohorts() {
  return useQuery<RetentionCohorts>({
    queryKey: ['menu-facile', 'retention-cohorts'],
    queryFn: async (): Promise<RetentionCohorts> => {
      const res = await getRetentionCohorts()
      if (res.error || !res.data) {
        throw new Error(res.error?.message ?? 'Cohortes indisponibles')
      }
      return res.data
    },
    ...AGGREGATE_OPTIONS,
  })
}

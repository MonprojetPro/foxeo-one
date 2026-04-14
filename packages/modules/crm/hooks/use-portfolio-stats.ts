'use client'

import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { ActionResponse } from '@monprojetpro/types'
import type { PortfolioStats, GraduationRate } from '../types/crm.types'
import { getPortfolioStats } from '../actions/get-portfolio-stats'
import { getGraduationRate } from '../actions/get-graduation-rate'

const STATS_STALE_TIME = 1000 * 60 * 10 // 10 minutes

export function usePortfolioStats(
  initialData?: PortfolioStats
): UseQueryResult<PortfolioStats, Error> {
  return useQuery({
    queryKey: ['portfolio-stats'],
    queryFn: async () => {
      const response: ActionResponse<PortfolioStats> = await getPortfolioStats()

      if (response.error) {
        throw new Error(response.error.message)
      }

      return response.data!
    },
    initialData,
    staleTime: STATS_STALE_TIME,
    refetchOnWindowFocus: false,
  })
}

export function useGraduationRate(
  initialData?: GraduationRate
): UseQueryResult<GraduationRate, Error> {
  return useQuery({
    queryKey: ['graduation-rate'],
    queryFn: async () => {
      const response: ActionResponse<GraduationRate> = await getGraduationRate()

      if (response.error) {
        throw new Error(response.error.message)
      }

      return response.data!
    },
    initialData,
    staleTime: STATS_STALE_TIME,
    refetchOnWindowFocus: false,
  })
}

import { useQuery } from '@tanstack/react-query'
import {
  getOverviewStats,
  getModuleUsageStats,
  getElioStats,
  getEngagementStats,
  getMrrStats,
  type AnalyticsPeriod,
  type OverviewStats,
  type ModuleUsageStat,
  type ElioStats,
  type EngagementStats,
  type MrrStats,
} from '../actions/get-analytics'

export interface AnalyticsData {
  overview: OverviewStats | null
  modules: ModuleUsageStat[] | null
  elio: ElioStats | null
  engagement: EngagementStats | null
  mrr: MrrStats | null
}

export function useAnalytics(period: AnalyticsPeriod = '30d') {
  return useQuery<AnalyticsData>({
    queryKey: ['analytics', period],
    queryFn: async (): Promise<AnalyticsData> => {
      const [overviewRes, modulesRes, elioRes, engagementRes, mrrRes] = await Promise.all([
        getOverviewStats(period),
        getModuleUsageStats(period),
        getElioStats(period),
        getEngagementStats(period),
        getMrrStats(),
      ])
      return {
        overview: overviewRes.data,
        modules: modulesRes.data,
        elio: elioRes.data,
        engagement: engagementRes.data,
        mrr: mrrRes.data,
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

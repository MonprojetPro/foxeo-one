import { useQuery } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@monprojetpro/supabase'

export interface MaintenanceConfig {
  enabled: boolean
  message: string
  estimatedDuration: string | null
}

export function useMaintenanceConfig() {
  return useQuery({
    queryKey: ['system-config', 'maintenance'],
    queryFn: async (): Promise<MaintenanceConfig> => {
      const supabase = createBrowserSupabaseClient()

      const { data, error } = await supabase
        .from('system_config')
        .select('key, value')
        .in('key', ['maintenance_mode', 'maintenance_message', 'maintenance_estimated_duration'])

      if (error) throw error

      const map: Record<string, unknown> = {}
      for (const row of data ?? []) {
        map[row.key] = row.value
      }

      return {
        enabled: map['maintenance_mode'] === true,
        message: typeof map['maintenance_message'] === 'string'
          ? map['maintenance_message']
          : 'La plateforme est en maintenance. Nous serons de retour très bientôt !',
        estimatedDuration: map['maintenance_estimated_duration'] != null
          ? String(map['maintenance_estimated_duration'])
          : null,
      }
    },
  })
}

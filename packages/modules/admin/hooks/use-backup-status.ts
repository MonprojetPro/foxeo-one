import { useQuery } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@monprojetpro/supabase'

export interface BackupEntry {
  date: string
  status: 'success' | 'partial' | 'failed'
  clientsCount: number
  sizeBytes: number
  triggeredBy: 'cron' | 'manual'
}

export interface BackupStatus {
  lastDailyBackup: BackupEntry | null
  lastWeeklyBackup: BackupEntry | null
  backupHistory: BackupEntry[]
}

export function useBackupStatus() {
  return useQuery({
    queryKey: ['system-config', 'backup'],
    queryFn: async (): Promise<BackupStatus> => {
      const supabase = createBrowserSupabaseClient()

      const { data, error } = await supabase
        .from('system_config')
        .select('key, value')
        .in('key', ['last_daily_backup', 'last_weekly_backup', 'backup_history'])

      if (error) throw error

      const map: Record<string, unknown> = {}
      for (const row of data ?? []) {
        map[row.key] = row.value
      }

      return {
        lastDailyBackup: (map['last_daily_backup'] as BackupEntry) ?? null,
        lastWeeklyBackup: (map['last_weekly_backup'] as BackupEntry) ?? null,
        backupHistory: Array.isArray(map['backup_history'])
          ? (map['backup_history'] as BackupEntry[])
          : [],
      }
    },
  })
}

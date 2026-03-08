/**
 * Backup logic — pure functions extracted for testability (Node/Vitest compatible).
 * The Edge Function duplicates these types/functions in Deno context.
 */

export interface BackupEntry {
  date: string
  status: 'success' | 'partial' | 'failed'
  clientsCount: number
  sizeBytes: number
  triggeredBy: 'cron' | 'manual'
}

export interface ClientBackupData {
  exportedAt: string
  clientId: string
  tables: Record<string, unknown>
}

/**
 * Generates the Storage path for a client backup.
 * Format: backups/{YYYY-MM-DD}/clients/{clientId}.json
 */
export function getWeeklyBackupPath(date: Date, clientId: string): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const dateStr = `${yyyy}-${mm}-${dd}`
  return `${dateStr}/clients/${clientId}.json`
}

/**
 * Parses the date from a backup Storage path.
 * Returns null if the path doesn't match the expected format.
 */
export function parseBackupDateFromPath(path: string): Date | null {
  const match = path.match(/^(\d{4}-\d{2}-\d{2})(?:\/|$)/)
  if (!match || !match[1]) return null
  const d = new Date(match[1] + 'T00:00:00Z')
  return isNaN(d.getTime()) ? null : d
}

/**
 * Given a list of backup folder names (dates), returns the ones to delete
 * to keep only `maxToKeep` most recent.
 */
export function selectBackupDatesToCleanup(dates: string[], maxToKeep: number): string[] {
  const sorted = [...dates].sort() // ascending: oldest first
  if (sorted.length <= maxToKeep) return []
  return sorted.slice(0, sorted.length - maxToKeep)
}

/**
 * Builds the JSON structure for a client's backup data.
 */
export function buildClientBackupPayload(
  clientId: string,
  tables: Record<string, unknown>
): ClientBackupData {
  return {
    exportedAt: new Date().toISOString(),
    clientId,
    tables,
  }
}

/**
 * Builds the system_config value for last_weekly_backup.
 */
export function buildBackupEntry(
  date: Date,
  clientsCount: number,
  sizeBytes: number,
  triggeredBy: 'cron' | 'manual' = 'cron',
  status: BackupEntry['status'] = 'success'
): BackupEntry {
  return {
    date: date.toISOString(),
    status,
    clientsCount,
    sizeBytes,
    triggeredBy,
  }
}

/**
 * Prepends a new backup entry to the history array and trims to maxEntries.
 */
export function updateBackupHistory(
  history: BackupEntry[],
  newEntry: BackupEntry,
  maxEntries = 30
): BackupEntry[] {
  return [newEntry, ...history].slice(0, maxEntries)
}

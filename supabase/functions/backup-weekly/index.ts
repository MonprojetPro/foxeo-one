// Edge Function: backup-weekly
// Story: 12.2 — Export complet données client & backups automatiques
//
// pg_cron setup (à exécuter manuellement dans Supabase SQL Editor) :
// SELECT cron.schedule(
//   'backup-weekly-sunday',
//   '0 3 * * 0', -- Dimanche à 3h
//   $$SELECT net.http_post(
//     url := '<SUPABASE_URL>/functions/v1/backup-weekly',
//     headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>", "Content-Type": "application/json"}'::jsonb,
//     body := '{"triggeredBy":"cron"}'::jsonb
//   )$$
// );
//
// Backup daily natif : géré automatiquement par Supabase Pro (rétention 30 jours).
// Backup hebdomadaire applicatif (cold) : export JSON des données clés vers Storage.
// Tables exportées : clients, client_configs, step_submissions, documents (metadata).
// Blobs Storage exclus pour limiter la taille.
// RPO : 24h max (backup quotidien natif), RTO : 4h max (plan Pro).
//
// Rétention : 52 derniers backups hebdomadaires conservés (1 an).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ActiveClient {
  id: string
  name: string
  email: string
  status: string
}

interface BackupEntry {
  date: string
  status: 'success' | 'partial' | 'failed'
  clientsCount: number
  sizeBytes: number
  triggeredBy: 'cron' | 'manual'
}

function getBackupPath(date: Date, clientId: string): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}/clients/${clientId}.json`
}

function parseDateFromPath(name: string): string | null {
  const match = name.match(/^(\d{4}-\d{2}-\d{2})$/)
  return match?.[1] ?? null
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[ADMIN:BACKUP_WEEKLY] Missing environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json().catch(() => ({})) as { triggeredBy?: string }
    const triggeredBy: 'cron' | 'manual' = body.triggeredBy === 'manual' ? 'manual' : 'cron'

    // Service role pour bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const now = new Date()

    // Fetch all active clients
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, email, status')
      .eq('status', 'active')

    if (clientsError) {
      console.error('[ADMIN:BACKUP_WEEKLY] Failed to fetch clients:', clientsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch clients' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const activeClients = (clients as ActiveClient[]) ?? []
    let successCount = 0
    let failCount = 0
    let totalBytes = 0

    for (const client of activeClients) {
      try {
        // Fetch key data for this client (metadata only, no blobs)
        const [
          { data: clientConfig },
          { data: submissions },
          { data: documents },
        ] = await Promise.all([
          supabase
            .from('client_configs')
            .select('*')
            .eq('client_id', client.id),
          supabase
            .from('step_submissions')
            .select('id, step_id, status, submitted_at, review_status')
            .eq('client_id', client.id),
          supabase
            .from('documents')
            .select('id, name, file_type, file_size, created_at, visibility')
            .eq('client_id', client.id),
        ])

        const payload = {
          exportedAt: now.toISOString(),
          clientId: client.id,
          tables: {
            client: { id: client.id, name: client.name, email: client.email, status: client.status },
            client_configs: clientConfig ?? [],
            step_submissions: submissions ?? [],
            documents: documents ?? [],
          },
        }

        const jsonContent = JSON.stringify(payload)
        const bytes = new TextEncoder().encode(jsonContent)
        const path = getBackupPath(now, client.id)

        const { error: uploadError } = await supabase.storage
          .from('backups')
          .upload(path, bytes, {
            contentType: 'application/json',
            upsert: true,
          })

        if (uploadError) {
          console.error(`[ADMIN:BACKUP_WEEKLY] Upload failed for client ${client.id}:`, uploadError)
          failCount++
        } else {
          successCount++
          totalBytes += bytes.byteLength
        }
      } catch (err) {
        console.error(`[ADMIN:BACKUP_WEEKLY] Error processing client ${client.id}:`, err)
        failCount++
      }
    }

    const overallStatus: BackupEntry['status'] = failCount === 0
      ? 'success'
      : successCount === 0
      ? 'failed'
      : 'partial'

    const newEntry: BackupEntry = {
      date: now.toISOString(),
      status: overallStatus,
      clientsCount: successCount,
      sizeBytes: totalBytes,
      triggeredBy,
    }

    // Read current backup_history from system_config
    const { data: historyRow } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'backup_history')
      .maybeSingle()

    const existingHistory: BackupEntry[] = Array.isArray(historyRow?.value)
      ? (historyRow.value as BackupEntry[])
      : []

    const updatedHistory = [newEntry, ...existingHistory].slice(0, 30)

    // Update system_config: last_weekly_backup + backup_history
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await Promise.all([
      supabase
        .from('system_config')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .upsert({ key: 'last_weekly_backup', value: newEntry as any }, { onConflict: 'key' }),
      supabase
        .from('system_config')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .upsert({ key: 'backup_history', value: updatedHistory as any }, { onConflict: 'key' }),
    ])

    // Cleanup: keep only 52 most recent weekly backup folders in Storage
    const { data: allFiles } = await supabase.storage
      .from('backups')
      .list('', { limit: 1000 })

    if (allFiles && allFiles.length > 0) {
      // Extract unique date folders from file paths
      const dateSet = new Set<string>()
      for (const file of allFiles) {
        const date = parseDateFromPath(file.name)
        if (date) dateSet.add(date)
      }

      const sortedDates = [...dateSet].sort() // ascending: oldest first
      const MAX_WEEKLY_BACKUPS = 52
      if (sortedDates.length > MAX_WEEKLY_BACKUPS) {
        const toDelete = sortedDates.slice(0, sortedDates.length - MAX_WEEKLY_BACKUPS)
        for (const date of toDelete) {
          // List files in this date folder then delete them
          const { data: dateFiles } = await supabase.storage
            .from('backups')
            .list(`${date}/clients`, { limit: 1000 })

          if (dateFiles && dateFiles.length > 0) {
            const paths = dateFiles.map((f) => `${date}/clients/${f.name}`)
            await supabase.storage.from('backups').remove(paths)
          }
        }
      }
    }

    console.log(
      `[ADMIN:BACKUP_WEEKLY] Completed: ${successCount} success, ${failCount} failed, ${totalBytes} bytes total`
    )

    return new Response(
      JSON.stringify({ success: true, status: overallStatus, successCount, failCount, totalBytes }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[ADMIN:BACKUP_WEEKLY] Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

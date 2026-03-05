// Edge Function: cleanup-expired-exports
// Story: 9.5a — Export RGPD des données client
// Exécution: quotidienne via pg_cron
//
// pg_cron setup (à exécuter manuellement dans Supabase SQL Editor) :
// SELECT cron.schedule(
//   'cleanup-expired-exports-daily',
//   '0 2 * * *', -- Tous les jours à 2h du matin
//   $$SELECT net.http_post(
//     url := '<SUPABASE_URL>/functions/v1/cleanup-expired-exports',
//     headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb
//   )$$
// );

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ExpiredExport {
  id: string
  file_path: string | null
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[EXPORT:CLEANUP] Missing environment variables')
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    // Find all completed exports that have expired
    const { data: expiredExports, error: fetchError } = await supabase
      .from('data_exports')
      .select('id, file_path')
      .eq('status', 'completed')
      .lt('expires_at', new Date().toISOString())

    if (fetchError) {
      console.error('[EXPORT:CLEANUP] Failed to fetch expired exports:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch expired exports' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!expiredExports || expiredExports.length === 0) {
      console.log('[EXPORT:CLEANUP] No expired exports found')
      return new Response(
        JSON.stringify({ success: true, deleted: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    let deleted = 0
    let errors = 0

    for (const exportRecord of expiredExports as ExpiredExport[]) {
      try {
        // Delete from Storage
        if (exportRecord.file_path) {
          const { error: storageError } = await supabase.storage
            .from('exports')
            .remove([exportRecord.file_path])

          if (storageError) {
            console.error(
              `[EXPORT:CLEANUP] Storage delete error for ${exportRecord.id}:`,
              storageError
            )
            errors++
            continue
          }
        }

        // Delete from database
        const { error: dbError } = await supabase
          .from('data_exports')
          .delete()
          .eq('id', exportRecord.id)

        if (dbError) {
          console.error(
            `[EXPORT:CLEANUP] DB delete error for ${exportRecord.id}:`,
            dbError
          )
          errors++
          continue
        }

        deleted++
      } catch (err) {
        console.error(`[EXPORT:CLEANUP] Error processing ${exportRecord.id}:`, err)
        errors++
      }
    }

    console.log(`[EXPORT:CLEANUP] Completed: ${deleted} deleted, ${errors} errors`)

    return new Response(
      JSON.stringify({ success: true, deleted, errors }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[EXPORT:CLEANUP] Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

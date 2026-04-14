// Edge Function: cleanup-archived-clients
// Triggered weekly by Supabase Cron (pg_cron) — Story 9.5c
// Anonymizes clients whose retention period has expired (RGPD compliance)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface AnonymizeResult {
  clientId: string
  status: 'success' | 'error'
  error?: string
}

Deno.serve(async (req: Request) => {
  // Authorization: only allow calls with valid service role key or matching secret
  const authHeader = req.headers.get('Authorization')
  const expectedKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const validAuth =
    authHeader === `Bearer ${expectedKey}` ||
    authHeader === `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`

  if (!validAuth) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    expectedKey, // Admin access — bypasses RLS
  )

  console.log('[CLEANUP] Starting cleanup of archived clients...')

  // 1. Fetch clients whose retention period has expired
  const { data: clientsToAnonymize, error: fetchError } = await supabase
    .from('clients')
    .select('id, name, email')
    .eq('status', 'archived')
    .lt('retention_until', new Date().toISOString())

  if (fetchError) {
    console.error('[CLEANUP] Error fetching clients:', fetchError)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch expired clients', details: fetchError }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (!clientsToAnonymize?.length) {
    console.log('[CLEANUP] No clients to anonymize.')
    return new Response(
      JSON.stringify({ message: 'No clients to anonymize', count: 0 }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }

  console.log(`[CLEANUP] Found ${clientsToAnonymize.length} client(s) to anonymize.`)

  const results: AnonymizeResult[] = []

  // 2. Anonymize each expired client
  for (const client of clientsToAnonymize) {
    try {
      const shortId = client.id.slice(-8)
      const anonymizedEmail = `deleted_${crypto.randomUUID()}@anonymized.monprojet-pro.com`

      // 2a. Anonymize personal data in clients table
      const { error: clientUpdateError } = await supabase
        .from('clients')
        .update({
          name: `Client supprimé #${shortId}`,
          email: anonymizedEmail,
          company: null,
          phone: null,
          status: 'deleted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', client.id)

      if (clientUpdateError) throw new Error(`clients update: ${clientUpdateError.message}`)

      // 2b. Delete Elio conversations (cascade deletes elio_messages via FK)
      const { error: elioConvError } = await supabase
        .from('elio_conversations')
        .delete()
        .eq('client_id', client.id)

      if (elioConvError) {
        console.warn(`[CLEANUP] elio_conversations delete warning for ${client.id}:`, elioConvError)
      }

      // 2c. Anonymize MiKL chat messages (preserve metadata for stats)
      const { error: messagesError } = await supabase
        .from('messages')
        .update({
          content: 'Message supprimé',
          sender_name: 'Utilisateur supprimé',
        })
        .eq('client_id', client.id)

      if (messagesError) {
        console.warn(`[CLEANUP] messages anonymize warning for ${client.id}:`, messagesError)
      }

      // 2d. Delete physical files from Storage (recursive — handles subdirectories)
      const deleteStorageFolder = async (prefix: string) => {
        const { data: items } = await supabase.storage
          .from('documents')
          .list(prefix)

        if (!items?.length) return

        const filePaths: string[] = []
        for (const item of items) {
          const fullPath = `${prefix}/${item.name}`
          if (item.id) {
            // It's a file
            filePaths.push(fullPath)
          } else {
            // It's a folder — recurse
            await deleteStorageFolder(fullPath)
          }
        }

        if (filePaths.length) {
          const { error: storageError } = await supabase.storage
            .from('documents')
            .remove(filePaths)

          if (storageError) {
            console.warn(`[CLEANUP] Storage delete warning for ${client.id} (${prefix}):`, storageError)
          }
        }
      }

      await deleteStorageFolder(client.id)

      // 2e. Delete notifications
      const { error: notifError } = await supabase
        .from('notifications')
        .delete()
        .eq('recipient_id', client.id)

      if (notifError) {
        console.warn(`[CLEANUP] notifications delete warning for ${client.id}:`, notifError)
      }

      // 2f. Delete client_configs (EXCEPT billing data from Epic 11 — preserved by FK constraint)
      const { error: configError } = await supabase
        .from('client_configs')
        .delete()
        .eq('client_id', client.id)

      if (configError) {
        console.warn(`[CLEANUP] client_configs delete warning for ${client.id}:`, configError)
      }

      // 2g. Anonymize validation_requests (preserve for stats, anonymize client name)
      const { error: validationError } = await supabase
        .from('validation_requests')
        .update({ client_name: `Client supprimé #${shortId}` })
        .eq('client_id', client.id)

      if (validationError) {
        console.warn(`[CLEANUP] validation_requests update warning for ${client.id}:`, validationError)
      }

      // 2h. Log anonymization event
      const { error: logError } = await supabase
        .from('activity_logs')
        .insert({
          actor_type: 'system',
          actor_id: client.id,
          action: 'client_data_purged',
          entity_type: 'client',
          entity_id: client.id,
          metadata: { anonymizedAt: new Date().toISOString() },
        })

      if (logError) {
        console.warn(`[CLEANUP] activity_logs insert warning for ${client.id}:`, logError)
      }

      results.push({ clientId: client.id, status: 'success' })
      console.log(`[CLEANUP] ✅ Anonymized client: ${client.id}`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error(`[CLEANUP] ❌ Failed to anonymize client ${client.id}:`, errorMessage)
      results.push({ clientId: client.id, status: 'error', error: errorMessage })
    }
  }

  const successCount = results.filter((r) => r.status === 'success').length
  const errorCount = results.filter((r) => r.status === 'error').length

  console.log(`[CLEANUP] Done. ${successCount} anonymized, ${errorCount} errors.`)

  return new Response(
    JSON.stringify({
      processed: clientsToAnonymize.length,
      success: successCount,
      errors: errorCount,
      results,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})

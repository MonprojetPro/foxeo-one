import { createClient } from '@supabase/supabase-js'
import type { Database } from '@monprojetpro/types'

/**
 * Client Supabase avec SERVICE_ROLE_KEY — bypass RLS.
 * À utiliser UNIQUEMENT pour les opérations internes serveur-serveur :
 * - Monitoring / logs (ex: elio_token_usage)
 * - Migrations de données
 * - Tâches cron / Edge Functions internes
 * Ne jamais exposer ce client côté navigateur.
 */
export function createServiceRoleSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables'
    )
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

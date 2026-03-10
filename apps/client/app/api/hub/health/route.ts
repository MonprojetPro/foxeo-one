// Story 12.7 — Task 1: Health check endpoint for Hub monitoring
// Auth: X-Hub-Secret header (HMAC validation against INSTANCE_SECRET env var)
// Returns UsageMetrics for the instance

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export interface UsageMetrics {
  dbRows: number
  storageUsedMb: number
  bandwidthUsedGb: number
  edgeFunctionCalls: number
}

// Verify HMAC-style secret — compare X-Hub-Secret to INSTANCE_SECRET
function isValidSecret(provided: string | null): boolean {
  const expected = process.env.INSTANCE_SECRET
  if (!expected || !provided) return false
  // Constant-time comparison to prevent timing attacks
  if (provided.length !== expected.length) return false
  let result = 0
  for (let i = 0; i < expected.length; i++) {
    result |= provided.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return result === 0
}

export async function GET(request: Request): Promise<NextResponse> {
  // Auth check
  const hubSecret = request.headers.get('X-Hub-Secret')
  if (!isValidSecret(hubSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Use service role client (bypass RLS) for pg_stat_user_tables access
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Calcul dbRows : sum des lignes vivantes dans toutes les tables utilisateur
    const { data: pgStats, error: pgError } = await supabase
      .rpc('get_total_row_count')
      .maybeSingle()

    // Fallback si la fonction RPC n'existe pas encore
    let dbRows = 0
    if (!pgError && pgStats !== null) {
      dbRows = (pgStats as { total_rows: number }).total_rows ?? 0
    } else {
      // Estimation directe via pg_stat_user_tables
      const { data: statRows } = await supabase
        .from('pg_stat_user_tables' as never)
        .select('n_live_tup')
      if (statRows) {
        dbRows = (statRows as { n_live_tup: number }[]).reduce(
          (sum, row) => sum + (Number(row.n_live_tup) || 0),
          0
        )
      }
    }

    // Calcul storageUsedMb : somme des tailles réelles depuis les métadonnées fichiers
    let storageTotalBytes = 0
    const { data: buckets } = await supabase.storage.listBuckets()
    if (buckets) {
      for (const bucket of buckets) {
        const { data: files } = await supabase.storage.from(bucket.name).list('', { limit: 1000 })
        if (files) {
          for (const file of files) {
            // metadata.size contient la taille en bytes si disponible
            const size = (file.metadata as { size?: number } | null)?.size
            storageTotalBytes += size ?? 0
          }
        }
      }
    }
    const storageUsedMb = storageTotalBytes / (1024 * 1024)

    // bandwidthUsedGb et edgeFunctionCalls : non disponibles via SQL
    // Valeurs approximées (0 pour MVP — Supabase Management API nécessiterait un token séparé)
    const bandwidthUsedGb = 0
    const edgeFunctionCalls = 0

    const metrics: UsageMetrics = {
      dbRows,
      storageUsedMb: Math.round(storageUsedMb * 100) / 100,
      bandwidthUsedGb,
      edgeFunctionCalls,
    }

    return NextResponse.json(metrics, { status: 200 })
  } catch (err) {
    console.error('[HUB:HEALTH] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

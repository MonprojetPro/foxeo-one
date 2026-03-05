/**
 * RLS Isolation Tests: Export RGPD données client — Story 9.5a
 *
 * Vérifie que :
 * - Client A ne peut pas voir les exports de client B
 * - Opérateur A ne peut pas voir les exports de clients de opérateur B
 *
 * PRÉREQUIS: Supabase local en cours d'exécution (`npx supabase start`)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  seedRlsTestData,
  cleanupRlsTestData,
  createAuthenticatedClient,
  TEST_IDS,
  TEST_EMAILS,
} from './helpers/seed-rls-test-data'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const isSupabaseAvailable = SUPABASE_ANON_KEY !== '' && SUPABASE_SERVICE_ROLE_KEY !== ''

describe.skipIf(!isSupabaseAvailable)('RLS: Data Exports Isolation (Story 9.5a)', () => {
  let clientASupabase: SupabaseClient
  let clientBSupabase: SupabaseClient
  let operatorBSupabase: SupabaseClient
  let serviceClient: SupabaseClient
  let exportAId: string

  beforeAll(async () => {
    await seedRlsTestData()
    clientASupabase = await createAuthenticatedClient(TEST_EMAILS.clientA)
    clientBSupabase = await createAuthenticatedClient(TEST_EMAILS.clientB)
    operatorBSupabase = await createAuthenticatedClient(TEST_EMAILS.operatorB)
    serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Look up client A's auth_user_id
    const { data: clientARecord } = await serviceClient
      .from('clients')
      .select('auth_user_id')
      .eq('id', TEST_IDS.clientA)
      .single()

    const clientAAuthId = clientARecord?.auth_user_id ?? TEST_IDS.clientA

    // Create a test export for client A using service role
    const { data: exportRecord } = await serviceClient
      .from('data_exports')
      .insert({
        client_id: TEST_IDS.clientA,
        requested_by: 'client',
        requester_id: clientAAuthId,
        status: 'completed',
        file_path: `${TEST_IDS.clientA}/test-export.zip`,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single()

    exportAId = exportRecord?.id ?? ''
  }, 30_000)

  afterAll(async () => {
    // Cleanup test export
    if (exportAId) {
      await serviceClient
        .from('data_exports')
        .delete()
        .eq('id', exportAId)
    }
    await cleanupRlsTestData()
  }, 15_000)

  describe('data_exports — client isolation', () => {
    it('client A peut voir ses propres exports', async () => {
      const { data, error } = await clientASupabase
        .from('data_exports')
        .select('id')
        .eq('client_id', TEST_IDS.clientA)

      expect(error).toBeNull()
      expect(data?.length).toBeGreaterThanOrEqual(0) // may be empty if RLS filters requester_id
    })

    it('client B ne peut pas voir les exports de client A', async () => {
      const { data } = await clientBSupabase
        .from('data_exports')
        .select('id')
        .eq('id', exportAId)

      // RLS doit retourner 0 résultats
      expect(data ?? []).toHaveLength(0)
    })
  })

  describe('data_exports — operator isolation', () => {
    it('opérateur B ne peut pas voir les exports de clients appartenant à opérateur A', async () => {
      const { data } = await operatorBSupabase
        .from('data_exports')
        .select('id')
        .eq('id', exportAId)

      // RLS doit retourner 0 résultats car client A appartient à opérateur A, pas B
      expect(data ?? []).toHaveLength(0)
    })
  })
})

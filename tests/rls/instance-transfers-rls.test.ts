/**
 * RLS Isolation Tests: instance_transfers — Story 9.5b
 *
 * Vérifie que :
 * - Opérateur A ne peut pas voir les transferts de clients de opérateur B
 * - Opérateur A ne peut pas initier un transfert pour un client de opérateur B
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

describe.skipIf(!isSupabaseAvailable)('RLS: Instance Transfers Isolation (Story 9.5b)', () => {
  let operatorASupabase: SupabaseClient
  let operatorBSupabase: SupabaseClient
  let serviceClient: SupabaseClient
  let transferAId: string
  let instanceAId: string

  beforeAll(async () => {
    await seedRlsTestData()
    operatorASupabase = await createAuthenticatedClient(TEST_EMAILS.operatorA)
    operatorBSupabase = await createAuthenticatedClient(TEST_EMAILS.operatorB)
    serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Create a test client_instances record for client A (via service role)
    const { data: instanceRecord } = await serviceClient
      .from('client_instances')
      .insert({
        client_id: TEST_IDS.clientA,
        instance_url: 'https://test-instance.monprojet-pro.com',
        slug: 'test-instance-rls',
        status: 'active',
        tier: 'base',
        active_modules: ['core-dashboard'],
      })
      .select('id')
      .single()

    instanceAId = instanceRecord?.id ?? ''

    // Create a test instance_transfers record for client A (via service role)
    if (instanceAId) {
      const { data: transferRecord } = await serviceClient
        .from('instance_transfers')
        .insert({
          client_id: TEST_IDS.clientA,
          instance_id: instanceAId,
          recipient_email: 'client-a@example.com',
          status: 'pending',
        })
        .select('id')
        .single()

      transferAId = transferRecord?.id ?? ''
    }
  }, 30_000)

  afterAll(async () => {
    // Cleanup
    if (transferAId) {
      await serviceClient.from('instance_transfers').delete().eq('id', transferAId)
    }
    if (instanceAId) {
      await serviceClient.from('client_instances').delete().eq('id', instanceAId)
    }
    await cleanupRlsTestData()
  }, 15_000)

  describe('instance_transfers — operator isolation', () => {
    it('opérateur A peut voir les transferts de ses propres clients', async () => {
      if (!transferAId) return

      const { data, error } = await operatorASupabase
        .from('instance_transfers')
        .select('id')
        .eq('id', transferAId)

      expect(error).toBeNull()
      expect(data?.length).toBe(1)
    })

    it('opérateur B ne peut pas voir les transferts de clients appartenant à opérateur A', async () => {
      if (!transferAId) return

      const { data } = await operatorBSupabase
        .from('instance_transfers')
        .select('id')
        .eq('id', transferAId)

      // RLS doit retourner 0 résultats
      expect(data ?? []).toHaveLength(0)
    })

    it('opérateur B ne peut pas insérer un transfert pour un client de opérateur A', async () => {
      if (!instanceAId) return

      const { error } = await operatorBSupabase
        .from('instance_transfers')
        .insert({
          client_id: TEST_IDS.clientA,
          instance_id: instanceAId,
          recipient_email: 'attacker@example.com',
          status: 'pending',
        })

      // RLS insert policy doit rejeter l'insertion
      expect(error).not.toBeNull()
    })
  })
})

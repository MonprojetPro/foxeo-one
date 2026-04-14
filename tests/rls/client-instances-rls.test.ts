/**
 * RLS Isolation Tests: client_instances — Story 9.1
 *
 * Vérifie qu'un opérateur ne peut accéder qu'aux instances de SES propres clients.
 * Un client Lab ne peut pas déclencher sa propre graduation (Hub only).
 *
 * PREREQUIS: Supabase local en cours d'execution (`npx supabase start`)
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

describe.skipIf(!isSupabaseAvailable)('RLS: client_instances isolation', () => {
  let operatorASupabase: SupabaseClient
  let operatorBSupabase: SupabaseClient
  let clientASupabase: SupabaseClient
  let serviceClient: SupabaseClient

  let instanceAId: string

  beforeAll(async () => {
    await seedRlsTestData()
    operatorASupabase = await createAuthenticatedClient(TEST_EMAILS.operatorA)
    operatorBSupabase = await createAuthenticatedClient(TEST_EMAILS.operatorB)
    clientASupabase = await createAuthenticatedClient(TEST_EMAILS.clientA)
    serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Seed a client_instance for client A (via service role)
    const { data } = await serviceClient
      .from('client_instances')
      .insert({
        client_id: TEST_IDS.clientA,
        instance_url: 'https://test-client-a.monprojet-pro.com',
        slug: 'test-client-a',
        status: 'active',
        tier: 'essentiel',
        active_modules: ['core-dashboard'],
      })
      .select('id')
      .single()

    instanceAId = data?.id ?? ''
  }, 30_000)

  afterAll(async () => {
    if (instanceAId) {
      await serviceClient.from('client_instances').delete().eq('id', instanceAId)
    }
    await cleanupRlsTestData()
  }, 15_000)

  describe('Operator isolation', () => {
    it('operator A can read instances of their own client', async () => {
      const { data, error } = await operatorASupabase
        .from('client_instances')
        .select('id')
        .eq('id', instanceAId)

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
    })

    it('operator B cannot read instances of operator A clients', async () => {
      const { data, error } = await operatorBSupabase
        .from('client_instances')
        .select('id')
        .eq('id', instanceAId)

      expect(error).toBeNull()
      expect(data).toHaveLength(0) // RLS filters out the row
    })

    it('operator B cannot insert instance for operator A client', async () => {
      const { error } = await operatorBSupabase
        .from('client_instances')
        .insert({
          client_id: TEST_IDS.clientA,
          instance_url: 'https://unauthorized.monprojet-pro.com',
          slug: 'unauthorized-insert',
          status: 'provisioning',
          tier: 'base',
          active_modules: ['core-dashboard'],
        })

      expect(error).not.toBeNull()
    })
  })

  describe('Client cannot trigger graduation (Hub only)', () => {
    it('client A cannot insert into client_instances', async () => {
      const { error } = await clientASupabase
        .from('client_instances')
        .insert({
          client_id: TEST_IDS.clientA,
          instance_url: 'https://self-graduate.monprojet-pro.com',
          slug: 'self-graduate',
          status: 'provisioning',
          tier: 'essentiel',
          active_modules: ['core-dashboard'],
        })

      expect(error).not.toBeNull()
    })

    it('client A cannot read client_instances', async () => {
      const { data } = await clientASupabase
        .from('client_instances')
        .select('id')
        .eq('id', instanceAId)

      // Clients have no SELECT policy on client_instances
      expect(data).toHaveLength(0)
    })
  })
})

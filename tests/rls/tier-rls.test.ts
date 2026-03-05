/**
 * RLS Isolation Tests: Changement de tier abonnement — Story 9.4
 *
 * Vérifie que :
 * - Un opérateur ne peut pas changer le tier d'un client d'un autre opérateur
 * - Un client ne peut pas changer son propre tier (Hub only)
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

describe.skipIf(!isSupabaseAvailable)('RLS: Tier Abonnement Isolation (Story 9.4)', () => {
  let clientASupabase: SupabaseClient
  let operatorBSupabase: SupabaseClient
  let serviceClient: SupabaseClient

  beforeAll(async () => {
    await seedRlsTestData()
    clientASupabase = await createAuthenticatedClient(TEST_EMAILS.clientA)
    operatorBSupabase = await createAuthenticatedClient(TEST_EMAILS.operatorB)
    serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }, 30_000)

  afterAll(async () => {
    await cleanupRlsTestData()
  }, 15_000)

  describe('client_configs — subscription_tier isolation', () => {
    it('un client ne peut pas modifier subscription_tier dans client_configs', async () => {
      // Un client authentifié tente de modifier son propre tier (Hub only)
      const { error } = await clientASupabase
        .from('client_configs')
        .update({ subscription_tier: 'agentique' })
        .eq('client_id', TEST_IDS.clientA)

      // RLS doit bloquer la modification (aucune ligne affectée ou erreur)
      // Les clients ne peuvent PAS écrire dans client_configs (opérateur seulement)
      expect(error).not.toBeNull()
    })

    it('opérateur B ne peut pas modifier le tier d\'un client appartenant à opérateur A', async () => {
      // Opérateur B essaie de modifier le tier d'un client qui appartient à opérateur A
      const { data: updatedRows, error } = await operatorBSupabase
        .from('client_configs')
        .update({ subscription_tier: 'agentique' })
        .eq('client_id', TEST_IDS.clientA)
        .select()

      // Soit erreur, soit 0 lignes affectées (RLS filtre la mise à jour)
      const affectedCount = updatedRows?.length ?? 0
      const hasError = error !== null

      expect(hasError || affectedCount === 0).toBe(true)
    })

    it('client ne peut pas lire subscription_tier d\'un autre client', async () => {
      // Client A essaie de lire la config du client B
      const { data } = await clientASupabase
        .from('client_configs')
        .select('subscription_tier')
        .eq('client_id', TEST_IDS.clientB)

      // RLS doit retourner 0 résultats
      expect(data ?? []).toHaveLength(0)
    })
  })
})

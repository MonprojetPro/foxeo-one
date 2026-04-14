/**
 * RLS Test Data Seeder — Story 1.5
 *
 * Creates test data for RLS isolation tests via service_role (bypass RLS).
 * Sets up 2 operators, 2 clients, 2 configs, 2 consents, and 2 auth users.
 *
 * PREREQUIS: Supabase local en cours d'execution (`npx supabase start`)
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Fixed UUIDs for deterministic test data
export const TEST_IDS = {
  operatorA: '10000000-0000-0000-0000-000000000001',
  operatorB: '10000000-0000-0000-0000-000000000002',
  clientA: '20000000-0000-0000-0000-000000000001',
  clientB: '20000000-0000-0000-0000-000000000002',
  parcoursTemplateA: '30000000-0000-0000-0000-000000000001',
  parcoursTemplateB: '30000000-0000-0000-0000-000000000002',
  parcoursA: '40000000-0000-0000-0000-000000000001',
  parcoursB: '40000000-0000-0000-0000-000000000002',
} as const

export const TEST_EMAILS = {
  operatorA: 'rls-test-operator-a@monprojetpro.test',
  operatorB: 'rls-test-operator-b@monprojetpro.test',
  clientA: 'rls-test-client-a@monprojetpro.test',
  clientB: 'rls-test-client-b@monprojetpro.test',
} as const

const TEST_PASSWORD = 'TestPassword123!'

export type TestAuthUsers = {
  clientAUserId: string
  clientBUserId: string
  operatorAUserId: string
  operatorBUserId: string
}

/**
 * Create auth users and seed test data for RLS isolation tests.
 * Returns auth user IDs for authenticated client creation.
 */
export async function seedRlsTestData(): Promise<TestAuthUsers> {
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 1. Create 4 auth users (2 operators + 2 clients)
  const operatorAAuth = await createAuthUser(adminClient, TEST_EMAILS.operatorA)
  const operatorBAuth = await createAuthUser(adminClient, TEST_EMAILS.operatorB)
  const clientAAuth = await createAuthUser(adminClient, TEST_EMAILS.clientA)
  const clientBAuth = await createAuthUser(adminClient, TEST_EMAILS.clientB)

  // 2. Insert operators
  await adminClient.from('operators').upsert([
    {
      id: TEST_IDS.operatorA,
      email: TEST_EMAILS.operatorA,
      name: 'RLS Test Operator A',
      role: 'operator',
      auth_user_id: operatorAAuth,
    },
    {
      id: TEST_IDS.operatorB,
      email: TEST_EMAILS.operatorB,
      name: 'RLS Test Operator B',
      role: 'operator',
      auth_user_id: operatorBAuth,
    },
  ], { onConflict: 'id' })

  // 3. Insert clients (A belongs to operator A, B belongs to operator B)
  await adminClient.from('clients').upsert([
    {
      id: TEST_IDS.clientA,
      operator_id: TEST_IDS.operatorA,
      email: TEST_EMAILS.clientA,
      name: 'RLS Test Client A',
      client_type: 'complet',
      status: 'active',
      auth_user_id: clientAAuth,
    },
    {
      id: TEST_IDS.clientB,
      operator_id: TEST_IDS.operatorB,
      email: TEST_EMAILS.clientB,
      name: 'RLS Test Client B',
      client_type: 'complet',
      status: 'active',
      auth_user_id: clientBAuth,
    },
  ], { onConflict: 'id' })

  // 4. Insert client configs
  await adminClient.from('client_configs').upsert([
    {
      client_id: TEST_IDS.clientA,
      operator_id: TEST_IDS.operatorA,
      active_modules: ['core-dashboard'],
      dashboard_type: 'lab',
      theme_variant: 'lab',
    },
    {
      client_id: TEST_IDS.clientB,
      operator_id: TEST_IDS.operatorB,
      active_modules: ['core-dashboard', 'chat'],
      dashboard_type: 'one',
      theme_variant: 'one',
    },
  ], { onConflict: 'client_id' })

  // 5. Insert consents
  await adminClient.from('consents').insert([
    {
      client_id: TEST_IDS.clientA,
      consent_type: 'cgu',
      accepted: true,
      version: '1.0',
      ip_address: '127.0.0.1',
    },
    {
      client_id: TEST_IDS.clientB,
      consent_type: 'cgu',
      accepted: true,
      version: '1.0',
      ip_address: '127.0.0.1',
    },
  ])

  // 6. Insert parcours_templates (one per operator)
  await adminClient.from('parcours_templates').upsert([
    {
      id: TEST_IDS.parcoursTemplateA,
      operator_id: TEST_IDS.operatorA,
      name: 'RLS Test Template A',
      description: 'Template for operator A',
      parcours_type: 'complet',
      stages: [{ key: 'vision', name: 'Vision', description: 'Step 1', order: 1 }],
      is_active: true,
    },
    {
      id: TEST_IDS.parcoursTemplateB,
      operator_id: TEST_IDS.operatorB,
      name: 'RLS Test Template B',
      description: 'Template for operator B',
      parcours_type: 'complet',
      stages: [{ key: 'vision', name: 'Vision', description: 'Step 1', order: 1 }],
      is_active: true,
    },
  ], { onConflict: 'id' })

  // 7. Insert parcours (one per client)
  await adminClient.from('parcours').upsert([
    {
      id: TEST_IDS.parcoursA,
      client_id: TEST_IDS.clientA,
      template_id: TEST_IDS.parcoursTemplateA,
      operator_id: TEST_IDS.operatorA,
      active_stages: [{ key: 'vision', active: true, status: 'pending' }],
      status: 'en_cours',
    },
    {
      id: TEST_IDS.parcoursB,
      client_id: TEST_IDS.clientB,
      template_id: TEST_IDS.parcoursTemplateB,
      operator_id: TEST_IDS.operatorB,
      active_stages: [{ key: 'vision', active: true, status: 'pending' }],
      status: 'en_cours',
    },
  ], { onConflict: 'id' })

  return {
    clientAUserId: clientAAuth,
    clientBUserId: clientBAuth,
    operatorAUserId: operatorAAuth,
    operatorBUserId: operatorBAuth,
  }
}

/**
 * Create an auth user via admin API, return user ID.
 * If user already exists, returns existing user ID.
 */
async function createAuthUser(adminClient: SupabaseClient, email: string): Promise<string> {
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  })

  if (error) {
    // User may already exist — try to find them
    const { data: users } = await adminClient.auth.admin.listUsers()
    const existing = users?.users?.find((u) => u.email === email)
    if (existing) return existing.id
    throw new Error(`Failed to create auth user ${email}: ${error.message}`)
  }

  return data.user.id
}

/**
 * Create an authenticated Supabase client for the given test email.
 */
export async function createAuthenticatedClient(email: string): Promise<SupabaseClient> {
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { error } = await client.auth.signInWithPassword({
    email,
    password: TEST_PASSWORD,
  })

  if (error) {
    throw new Error(`Failed to sign in as ${email}: ${error.message}`)
  }

  return client
}

/**
 * Cleanup test data. Call in afterAll.
 */
export async function cleanupRlsTestData(): Promise<void> {
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Delete in reverse dependency order
  await adminClient.from('parcours').delete().in('id', [TEST_IDS.parcoursA, TEST_IDS.parcoursB])
  await adminClient.from('parcours_templates').delete().in('id', [TEST_IDS.parcoursTemplateA, TEST_IDS.parcoursTemplateB])
  await adminClient.from('consents').delete().in('client_id', [TEST_IDS.clientA, TEST_IDS.clientB])
  await adminClient.from('client_configs').delete().in('client_id', [TEST_IDS.clientA, TEST_IDS.clientB])
  await adminClient.from('clients').delete().in('id', [TEST_IDS.clientA, TEST_IDS.clientB])
  await adminClient.from('operators').delete().in('id', [TEST_IDS.operatorA, TEST_IDS.operatorB])

  // Delete auth users (single listUsers call, then filter + delete)
  const { data: allUsers } = await adminClient.auth.admin.listUsers()
  const testEmails = new Set(Object.values(TEST_EMAILS))
  const testUsers = allUsers?.users?.filter((u) => u.email && testEmails.has(u.email)) ?? []
  for (const user of testUsers) {
    await adminClient.auth.admin.deleteUser(user.id)
  }
}

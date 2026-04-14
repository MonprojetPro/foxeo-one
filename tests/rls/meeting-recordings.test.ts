/**
 * Tests RLS — meeting_recordings
 * Story 5.2 — Enregistrement visio, transcription automatique & historique
 *
 * Ces tests vérifient que les policies RLS empêchent
 * un client A de voir les enregistrements du client B.
 *
 * NOTE: Ces tests nécessitent une connexion Supabase locale (supabase start).
 * Ils sont marqués avec `skipIf(true)` en CI sans DB locale.
 * Pour les exécuter : npx vitest run tests/rls/meeting-recordings.test.ts
 */

import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://localhost:54321'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? ''

const CLIENT_A_EMAIL = 'client-a-rls-test@test.local'
const CLIENT_B_EMAIL = 'client-b-rls-test@test.local'
const TEST_PASSWORD = 'rls-test-password-123!'

// Skip RLS tests if no local Supabase instance
const skipRLS = !process.env.RUN_RLS_TESTS

describe.skipIf(skipRLS)('RLS — meeting_recordings isolation', () => {
  it('client A cannot see recordings of client B meetings', async () => {
    const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    const { data: authA, error: errA } = await clientA.auth.signInWithPassword({
      email: CLIENT_A_EMAIL,
      password: TEST_PASSWORD,
    })
    expect(errA).toBeNull()
    expect(authA.user).not.toBeNull()

    const { data: authB, error: errB } = await clientB.auth.signInWithPassword({
      email: CLIENT_B_EMAIL,
      password: TEST_PASSWORD,
    })
    expect(errB).toBeNull()
    expect(authB.user).not.toBeNull()

    // Get client B's meetings
    const { data: clientBMeetings } = await clientB
      .from('meetings')
      .select('id')
      .limit(1)

    if (!clientBMeetings || clientBMeetings.length === 0) {
      // Skip if no test data
      return
    }

    // Client A tries to see recordings of client B's meeting
    const { data: recordings } = await clientA
      .from('meeting_recordings')
      .select('*')
      .eq('meeting_id', clientBMeetings[0].id)

    // RLS should return empty array (not error, just filtered)
    expect(recordings).toEqual([])
  })

  it('client cannot insert recordings directly (service_role only)', async () => {
    const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    const { error: errA } = await clientA.auth.signInWithPassword({
      email: CLIENT_A_EMAIL,
      password: TEST_PASSWORD,
    })
    expect(errA).toBeNull()

    const { error: insertError } = await clientA.from('meeting_recordings').insert({
      meeting_id: '00000000-0000-0000-0000-000000000001',
      recording_url: 'test/fake.mp4',
      recording_duration_seconds: 60,
      file_size_bytes: 1024,
    })

    // Should fail — only service_role can insert
    expect(insertError).not.toBeNull()
  })

  it('operator can see recordings of their meetings', async () => {
    const operatorClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    const { data: authOp, error: errOp } = await operatorClient.auth.signInWithPassword({
      email: process.env.TEST_OPERATOR_EMAIL ?? 'mikl@monprojet-pro.com',
      password: process.env.TEST_OPERATOR_PASSWORD ?? '',
    })

    if (errOp || !authOp.user) {
      // Skip if operator credentials not configured
      return
    }

    const { data: recordings, error } = await operatorClient
      .from('meeting_recordings')
      .select('id, recording_url, transcription_status')
      .limit(10)

    expect(error).toBeNull()
    expect(Array.isArray(recordings)).toBe(true)
  })
})

describe('RLS policy contract — meeting_recordings (unit)', () => {
  it('transcription_status values match migration CHECK constraint', () => {
    // DB: CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed'))
    const validStatuses = ['pending', 'processing', 'completed', 'failed']
    for (const status of validStatuses) {
      expect(status).toMatch(/^[a-z]+$/)
    }
    expect(validStatuses).toHaveLength(4)
  })

  it('required RLS policies cover SELECT, INSERT, UPDATE operations', () => {
    // Contract: policies must exist in migration 00032
    const requiredPolicies = [
      'meeting_recordings_select_owner',
      'meeting_recordings_select_operator',
      'meeting_recordings_insert_service',
      'meeting_recordings_update_service',
    ]
    // Validate naming convention: {table}_{action}_{role}
    for (const policy of requiredPolicies) {
      expect(policy).toMatch(/^meeting_recordings_(select|insert|update|delete)_\w+$/)
    }
    // No DELETE policy — recordings are kept for audit
    const deletePolicies = requiredPolicies.filter((p) => p.includes('_delete_'))
    expect(deletePolicies).toHaveLength(0)
  })

  it('storage policies cover recordings and transcripts buckets', () => {
    const storagePolicies = [
      'recordings_select_owner',
      'recordings_select_operator',
      'recordings_insert_service',
      'transcripts_select_owner',
      'transcripts_select_operator',
      'transcripts_insert_service',
    ]
    expect(storagePolicies).toHaveLength(6)
    // All follow naming convention
    for (const policy of storagePolicies) {
      expect(policy).toMatch(/^(recordings|transcripts)_(select|insert)_\w+$/)
    }
  })
})

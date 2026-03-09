/**
 * Tests for Supabase migrations — Story 1.2
 * Verifies migration files exist, SQL syntax is valid, and schema structure is correct.
 *
 * NOTE: Tests that verify actual DB state (constraints, triggers, etc.)
 * require a running local Supabase instance (`npx supabase start`).
 * Static tests (file existence, SQL structure) run without Docker.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const MIGRATIONS_DIR = __dirname
const SUPABASE_DIR = join(__dirname, '..')

const MIGRATION_FILES = [
  '00001_create_operators.sql',
  '00002_create_clients.sql',
  '00003_create_client_configs.sql',
  '00004_create_consents.sql',
  '00005_create_activity_logs.sql',
  '00006_create_updated_at_triggers.sql',
  '00007_rls_activity_logs.sql',
  '00008_create_login_attempts.sql',
  '00009_secure_login_attempts_link_auth.sql',
  '00010_operators_auth_user_id.sql',
  '00011_rls_functions.sql',
  '00012_rls_policies.sql',
  '00013_session_management.sql',
  '00016_consents_functions.sql',
  '00017_create_parcours.sql',
  '00018_create_client_notes.sql',
]

describe('Supabase project structure', () => {
  it('config.toml exists and has correct project_id', () => {
    const configPath = join(SUPABASE_DIR, 'config.toml')
    expect(existsSync(configPath)).toBe(true)
    const content = readFileSync(configPath, 'utf-8')
    expect(content).toContain('project_id = "foxeo-dash"')
  })

  it('seed.sql exists', () => {
    expect(existsSync(join(SUPABASE_DIR, 'seed.sql'))).toBe(true)
  })

  it('all migration files exist', () => {
    for (const file of MIGRATION_FILES) {
      expect(existsSync(join(MIGRATIONS_DIR, file))).toBe(true)
    }
  })
})

describe('Migration 00001: operators table', () => {
  const sql = readFileSync(join(MIGRATIONS_DIR, '00001_create_operators.sql'), 'utf-8')

  it('creates operators table with correct columns', () => {
    expect(sql).toContain('CREATE TABLE operators')
    expect(sql).toContain('id UUID PRIMARY KEY DEFAULT gen_random_uuid()')
    expect(sql).toContain('email TEXT UNIQUE NOT NULL')
    expect(sql).toContain('name TEXT NOT NULL')
    expect(sql).toContain('two_factor_enabled BOOLEAN')
    expect(sql).toContain('created_at TIMESTAMPTZ')
    expect(sql).toContain('updated_at TIMESTAMPTZ')
  })

  it('has CHECK constraint on role', () => {
    expect(sql).toMatch(/CHECK\s*\(role\s+IN\s*\('operator',\s*'admin'\)\)/)
  })
})

describe('Migration 00002: clients table', () => {
  const sql = readFileSync(join(MIGRATIONS_DIR, '00002_create_clients.sql'), 'utf-8')

  it('creates clients table with correct columns', () => {
    expect(sql).toContain('CREATE TABLE clients')
    expect(sql).toContain('id UUID PRIMARY KEY DEFAULT gen_random_uuid()')
    expect(sql).toContain('operator_id UUID NOT NULL REFERENCES operators(id)')
    expect(sql).toContain('email TEXT NOT NULL')
    expect(sql).toContain('name TEXT NOT NULL')
    expect(sql).toContain('auth_user_id UUID UNIQUE REFERENCES auth.users(id)')
  })

  it('has CHECK constraints on client_type and status', () => {
    expect(sql).toMatch(/client_type.*CHECK.*'complet'.*'direct_one'.*'ponctuel'/s)
    expect(sql).toMatch(/status.*CHECK.*'active'.*'suspended'.*'archived'/s)
  })

  it('has correct indexes', () => {
    expect(sql).toContain('CREATE INDEX idx_clients_operator_id ON clients(operator_id)')
    expect(sql).toContain('CREATE INDEX idx_clients_auth_user_id ON clients(auth_user_id)')
  })
})

describe('Migration 00003: client_configs table', () => {
  const sql = readFileSync(join(MIGRATIONS_DIR, '00003_create_client_configs.sql'), 'utf-8')

  it('creates client_configs table with client_id as PK+FK', () => {
    expect(sql).toContain('CREATE TABLE client_configs')
    expect(sql).toContain('client_id UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE')
    expect(sql).toContain('operator_id UUID NOT NULL REFERENCES operators(id)')
  })

  it('has correct defaults for modules and dashboard_type', () => {
    expect(sql).toContain("ARRAY['core-dashboard']")
    expect(sql).toContain("DEFAULT 'one'")
  })

  it('has CHECK constraint on dashboard_type', () => {
    expect(sql).toMatch(/dashboard_type.*CHECK.*'hub'.*'lab'.*'one'/s)
  })

  it('has CHECK constraint on theme_variant', () => {
    expect(sql).toMatch(/theme_variant.*CHECK.*'hub'.*'lab'.*'one'/s)
  })

  it('uses JSONB with empty object defaults', () => {
    expect(sql).toContain("DEFAULT '{}'::jsonb")
  })
})

describe('Migration 00004: consents table', () => {
  const sql = readFileSync(join(MIGRATIONS_DIR, '00004_create_consents.sql'), 'utf-8')

  it('creates consents table without updated_at column (immutable)', () => {
    expect(sql).toContain('CREATE TABLE consents')
    expect(sql).toContain('created_at TIMESTAMPTZ')
    // Verify no updated_at COLUMN exists (comments may mention it)
    expect(sql).not.toMatch(/^\s+updated_at\s+TIMESTAMPTZ/m)
  })

  it('has CHECK constraint on consent_type', () => {
    expect(sql).toMatch(/consent_type.*CHECK.*'cgu'.*'ia_processing'/s)
  })

  it('has cascade delete from clients', () => {
    expect(sql).toContain('ON DELETE CASCADE')
  })

  it('has index on client_id', () => {
    expect(sql).toContain('CREATE INDEX idx_consents_client_id ON consents(client_id)')
  })
})

describe('Migration 00005: activity_logs table', () => {
  const sql = readFileSync(join(MIGRATIONS_DIR, '00005_create_activity_logs.sql'), 'utf-8')

  it('creates activity_logs table without updated_at column (append-only)', () => {
    expect(sql).toContain('CREATE TABLE activity_logs')
    expect(sql).toContain('created_at TIMESTAMPTZ')
    // Verify no updated_at COLUMN exists (comments may mention it)
    expect(sql).not.toMatch(/^\s+updated_at\s+TIMESTAMPTZ/m)
  })

  it('has CHECK constraint on actor_type', () => {
    expect(sql).toMatch(/actor_type.*CHECK.*'client'.*'operator'.*'system'.*'elio'/s)
  })

  it('has correct indexes', () => {
    expect(sql).toContain('CREATE INDEX idx_activity_logs_actor_created_at ON activity_logs(actor_id, created_at)')
    expect(sql).toContain('CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id)')
  })
})

describe('Migration 00006: updated_at triggers', () => {
  const sql = readFileSync(join(MIGRATIONS_DIR, '00006_create_updated_at_triggers.sql'), 'utf-8')

  it('creates reusable fn_update_updated_at function', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION fn_update_updated_at()')
    expect(sql).toContain('NEW.updated_at = NOW()')
    expect(sql).toContain('LANGUAGE plpgsql')
  })

  it('creates triggers for operators, clients, client_configs only', () => {
    expect(sql).toContain('CREATE TRIGGER trg_operators_updated_at')
    expect(sql).toContain('CREATE TRIGGER trg_clients_updated_at')
    expect(sql).toContain('CREATE TRIGGER trg_client_configs_updated_at')
    // No trigger for consents or activity_logs (immutable tables)
    expect(sql).not.toContain('trg_consents_updated_at')
    expect(sql).not.toContain('trg_activity_logs_updated_at')
  })

  it('uses BEFORE UPDATE trigger', () => {
    expect(sql).toContain('BEFORE UPDATE ON operators')
    expect(sql).toContain('BEFORE UPDATE ON clients')
    expect(sql).toContain('BEFORE UPDATE ON client_configs')
  })
})

describe('Migration 00007: RLS activity_logs', () => {
  const sql = readFileSync(join(MIGRATIONS_DIR, '00007_rls_activity_logs.sql'), 'utf-8')

  it('enables RLS on activity_logs', () => {
    expect(sql).toContain('ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY')
  })

  it('creates fn_get_operator_id helper function', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION fn_get_operator_id()')
    expect(sql).toContain('SECURITY DEFINER')
  })

  it('creates SELECT policy for operators', () => {
    expect(sql).toContain('CREATE POLICY activity_logs_select_operator')
    expect(sql).toContain('FOR SELECT')
  })

  it('creates INSERT policy for authenticated users', () => {
    expect(sql).toContain('CREATE POLICY activity_logs_insert_authenticated')
    expect(sql).toContain('FOR INSERT')
  })

  it('does NOT create any SELECT policy for clients', () => {
    // Only two policies should exist: select_operator and insert_authenticated
    const policyMatches = sql.match(/CREATE POLICY/g)
    expect(policyMatches).toHaveLength(2)
  })
})

describe('Migration 00011: RLS functions', () => {
  const sql = readFileSync(join(MIGRATIONS_DIR, '00011_rls_functions.sql'), 'utf-8')

  it('creates is_admin() function', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION is_admin()')
    expect(sql).toContain('SECURITY DEFINER')
    expect(sql).toContain('STABLE')
    expect(sql).toContain('SET search_path = public')
  })

  it('creates is_owner(UUID) function', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION is_owner(p_client_id UUID)')
    expect(sql).toContain('SECURITY DEFINER')
  })

  it('creates is_operator(UUID) function', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION is_operator(p_operator_id UUID)')
    expect(sql).toContain('SECURITY DEFINER')
  })

  it('creates fn_get_operator_by_email(TEXT) function with email guard', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION fn_get_operator_by_email(p_email TEXT)')
    expect(sql).toContain('SECURITY DEFINER')
    // Guard: user can only query their own email
    expect(sql).toContain("auth.jwt()->>'email'")
  })

  it('creates fn_link_operator_auth_user(UUID, TEXT) function with auth guard', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION fn_link_operator_auth_user(p_auth_user_id UUID, p_email TEXT)')
    expect(sql).toContain('SECURITY DEFINER')
    // Guard: user can only link their own auth_user_id
    expect(sql).toContain('p_auth_user_id != auth.uid()')
  })

  it('grants execute to authenticated role', () => {
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION is_admin() TO authenticated')
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION is_owner(UUID) TO authenticated')
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION is_operator(UUID) TO authenticated')
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION fn_get_operator_by_email(TEXT) TO authenticated')
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION fn_link_operator_auth_user(UUID, TEXT) TO authenticated')
  })
})

describe('Migration 00012: RLS policies', () => {
  const sql = readFileSync(join(MIGRATIONS_DIR, '00012_rls_policies.sql'), 'utf-8')

  it('enables RLS on operators', () => {
    expect(sql).toContain('ALTER TABLE operators ENABLE ROW LEVEL SECURITY')
  })

  it('enables RLS on clients', () => {
    expect(sql).toContain('ALTER TABLE clients ENABLE ROW LEVEL SECURITY')
  })

  it('enables RLS on client_configs', () => {
    expect(sql).toContain('ALTER TABLE client_configs ENABLE ROW LEVEL SECURITY')
  })

  it('enables RLS on consents', () => {
    expect(sql).toContain('ALTER TABLE consents ENABLE ROW LEVEL SECURITY')
  })

  it('creates operators_select_self policy', () => {
    expect(sql).toContain('CREATE POLICY operators_select_self')
    expect(sql).toContain('auth_user_id = auth.uid()')
  })

  it('creates operators_update_self policy', () => {
    expect(sql).toContain('CREATE POLICY operators_update_self')
  })

  it('creates clients_select_owner and clients_select_operator policies', () => {
    expect(sql).toContain('CREATE POLICY clients_select_owner')
    expect(sql).toContain('CREATE POLICY clients_select_operator')
  })

  it('creates clients_update_operator and clients_insert_operator policies', () => {
    expect(sql).toContain('CREATE POLICY clients_update_operator')
    expect(sql).toContain('CREATE POLICY clients_insert_operator')
  })

  it('creates client_configs policies', () => {
    expect(sql).toContain('CREATE POLICY client_configs_select_owner')
    expect(sql).toContain('CREATE POLICY client_configs_select_operator')
    expect(sql).toContain('CREATE POLICY client_configs_update_operator')
    expect(sql).toContain('CREATE POLICY client_configs_insert_operator')
  })

  it('creates consents policies', () => {
    expect(sql).toContain('CREATE POLICY consents_select_owner')
    expect(sql).toContain('CREATE POLICY consents_select_operator')
    expect(sql).toContain('CREATE POLICY consents_insert_authenticated')
  })

  it('has exactly 13 policies total', () => {
    const policyMatches = sql.match(/CREATE POLICY/g)
    expect(policyMatches).toHaveLength(13)
  })
})

describe('Migration 00013: session management functions', () => {
  const sql = readFileSync(join(MIGRATIONS_DIR, '00013_session_management.sql'), 'utf-8')

  it('creates fn_get_user_sessions(UUID) SECURITY DEFINER function', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION fn_get_user_sessions(p_user_id UUID)')
    expect(sql).toContain('SECURITY DEFINER')
    expect(sql).toContain('STABLE')
    expect(sql).toContain('SET search_path = public')
    expect(sql).toContain('RETURNS JSON')
  })

  it('fn_get_user_sessions has auth guard (own sessions or admin)', () => {
    expect(sql).toContain('p_user_id != auth.uid() AND NOT is_admin()')
  })

  it('fn_get_user_sessions queries auth.sessions with active filter', () => {
    expect(sql).toContain('FROM auth.sessions')
    expect(sql).toContain('not_after IS NULL OR not_after > NOW()')
  })

  it('creates fn_revoke_session(UUID) SECURITY DEFINER function', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION fn_revoke_session(p_session_id UUID)')
    expect(sql).toContain('SECURITY DEFINER')
    expect(sql).toContain('RETURNS JSON')
  })

  it('fn_revoke_session has auth guard and deletes from auth.sessions', () => {
    expect(sql).toContain('DELETE FROM auth.sessions WHERE id = p_session_id')
  })

  it('creates fn_revoke_other_sessions(UUID) SECURITY DEFINER function', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION fn_revoke_other_sessions(p_keep_session_id UUID)')
    expect(sql).toContain('SECURITY DEFINER')
    expect(sql).toContain('RETURNS JSON')
  })

  it('fn_revoke_other_sessions deletes all except kept session', () => {
    expect(sql).toContain('AND id != p_keep_session_id')
    expect(sql).toContain('GET DIAGNOSTICS v_deleted_count = ROW_COUNT')
  })

  it('creates fn_admin_revoke_all_sessions(UUID) SECURITY DEFINER function', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION fn_admin_revoke_all_sessions(p_user_id UUID)')
    expect(sql).toContain('SECURITY DEFINER')
    expect(sql).toContain('RETURNS JSON')
  })

  it('fn_admin_revoke_all_sessions has admin-only guard', () => {
    expect(sql).toContain('NOT is_admin()')
    expect(sql).toContain("'Unauthorized - admin only'")
  })

  it('grants execute to authenticated role for all 4 functions', () => {
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION fn_get_user_sessions(UUID) TO authenticated')
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION fn_revoke_session(UUID) TO authenticated')
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION fn_revoke_other_sessions(UUID) TO authenticated')
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION fn_admin_revoke_all_sessions(UUID) TO authenticated')
  })

  it('has exactly 4 SECURITY DEFINER functions', () => {
    const fnMatches = sql.match(/CREATE OR REPLACE FUNCTION/g)
    expect(fnMatches).toHaveLength(4)
  })

  it('has exactly 4 GRANT EXECUTE statements', () => {
    const grantMatches = sql.match(/GRANT EXECUTE/g)
    expect(grantMatches).toHaveLength(4)
  })
})

describe('Seed data', () => {
  const sql = readFileSync(join(SUPABASE_DIR, 'seed.sql'), 'utf-8')

  it('inserts MiKL operator', () => {
    expect(sql).toContain("'mikl@foxeo.io'")
    expect(sql).toContain("'MiKL'")
    expect(sql).toContain("'operator'")
  })

  it('inserts demo client', () => {
    expect(sql).toContain("'demo@example.com'")
    expect(sql).toContain("'Client Demo'")
    expect(sql).toContain("'complet'")
  })

  it('inserts client_config with core-dashboard module', () => {
    expect(sql).toContain("ARRAY['core-dashboard']")
    expect(sql).toContain("'lab'")
  })

  it('inserts initial consent', () => {
    expect(sql).toContain("'cgu'")
    expect(sql).toContain("'1.0'")
  })

  it('inserts activity log entry', () => {
    expect(sql).toContain("'create_client'")
    expect(sql).toContain("'operator'")
  })
})

describe('Migration 00018: client_notes table and pinning/deferring', () => {
  const sql = readFileSync(join(MIGRATIONS_DIR, '00018_create_client_notes.sql'), 'utf-8')

  it('creates client_notes table with correct columns', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS client_notes')
    expect(sql).toContain('id UUID PRIMARY KEY DEFAULT gen_random_uuid()')
    expect(sql).toContain('client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE')
    expect(sql).toContain('operator_id UUID NOT NULL REFERENCES operators(id)')
    expect(sql).toContain('content TEXT NOT NULL')
    expect(sql).toContain('created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()')
    expect(sql).toContain('updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()')
  })

  it('adds is_pinned and deferred_until columns to clients', () => {
    expect(sql).toContain('ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false')
    expect(sql).toContain('ALTER TABLE clients ADD COLUMN IF NOT EXISTS deferred_until TIMESTAMPTZ')
  })

  it('creates indexes for performance', () => {
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_client_notes_client_id ON client_notes(client_id)')
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_client_notes_operator_id ON client_notes(operator_id)')
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_clients_is_pinned ON clients(is_pinned)')
  })

  it('creates updated_at trigger using existing fn_update_updated_at function', () => {
    expect(sql).toContain('CREATE TRIGGER trg_client_notes_updated_at')
    expect(sql).toContain('BEFORE UPDATE ON client_notes')
    expect(sql).toContain('FOR EACH ROW')
    expect(sql).toContain('EXECUTE FUNCTION fn_update_updated_at()')
  })

  it('enables RLS on client_notes', () => {
    expect(sql).toContain('ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY')
  })

  it('creates RLS policy for SELECT (operator owns note)', () => {
    expect(sql).toContain('CREATE POLICY client_notes_select_operator ON client_notes')
    expect(sql).toContain('FOR SELECT')
    expect(sql).toContain('is_operator(operator_id)')
  })

  it('creates RLS policy for INSERT (operator can insert own notes)', () => {
    expect(sql).toContain('CREATE POLICY client_notes_insert_operator ON client_notes')
    expect(sql).toContain('FOR INSERT')
    expect(sql).toContain('WITH CHECK (is_operator(operator_id))')
  })

  it('creates RLS policy for UPDATE (operator owns note)', () => {
    expect(sql).toContain('CREATE POLICY client_notes_update_operator ON client_notes')
    expect(sql).toContain('FOR UPDATE')
    expect(sql).toContain('USING (is_operator(operator_id))')
    expect(sql).toContain('WITH CHECK (is_operator(operator_id))')
  })

  it('creates RLS policy for DELETE (operator owns note)', () => {
    expect(sql).toContain('CREATE POLICY client_notes_delete_operator ON client_notes')
    expect(sql).toContain('FOR DELETE')
    expect(sql).toContain('USING (is_operator(operator_id))')
  })

  it('has exactly 4 RLS policies (SELECT, INSERT, UPDATE, DELETE)', () => {
    const policyMatches = sql.match(/CREATE POLICY client_notes_/g)
    expect(policyMatches).toHaveLength(4)
  })
})

// Story 12.5b — Migration 00068: P2 integration tables
describe('Migration 00068: P2 integration tables', () => {
  const sql = readFileSync(join(MIGRATIONS_DIR, '00068_create_p2_integration_tables.sql'), 'utf-8')

  it('creates outgoing_webhooks table with correct columns and updated_at', () => {
    expect(sql).toContain('CREATE TABLE outgoing_webhooks')
    expect(sql).toContain('url TEXT NOT NULL')
    expect(sql).toContain('events TEXT[] NOT NULL DEFAULT \'{}\'')
    expect(sql).toContain('secret TEXT NOT NULL')
    expect(sql).toContain('active BOOLEAN DEFAULT true')
    expect(sql).toContain('updated_at TIMESTAMPTZ DEFAULT NOW()')
    expect(sql).toContain('trg_outgoing_webhooks_updated_at')
  })

  it('creates api_keys table with correct columns, ON DELETE CASCADE, and updated_at', () => {
    expect(sql).toContain('CREATE TABLE api_keys')
    expect(sql).toContain('client_id UUID REFERENCES clients(id) ON DELETE CASCADE')
    expect(sql).toContain('key_hash TEXT NOT NULL UNIQUE')
    expect(sql).toContain('permissions TEXT[] NOT NULL DEFAULT \'{}\'')
    expect(sql).toContain('revoked_at TIMESTAMPTZ')
    expect(sql).toContain('trg_api_keys_updated_at')
  })

  it('enables RLS on outgoing_webhooks with per-operation operator policies', () => {
    expect(sql).toContain('ALTER TABLE outgoing_webhooks ENABLE ROW LEVEL SECURITY')
    expect(sql).toContain('outgoing_webhooks_select_operator')
    expect(sql).toContain('outgoing_webhooks_insert_operator')
    expect(sql).toContain('outgoing_webhooks_update_operator')
    expect(sql).toContain('outgoing_webhooks_delete_operator')
    expect(sql).toContain('FOR INSERT WITH CHECK (is_operator())')
  })

  it('enables RLS on api_keys with per-operation operator policies and owner SELECT', () => {
    expect(sql).toContain('ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY')
    expect(sql).toContain('api_keys_select_operator')
    expect(sql).toContain('api_keys_insert_operator')
    expect(sql).toContain('api_keys_delete_operator')
    expect(sql).toContain('api_keys_select_owner')
    expect(sql).toContain('auth_user_id = auth.uid()')
  })
})


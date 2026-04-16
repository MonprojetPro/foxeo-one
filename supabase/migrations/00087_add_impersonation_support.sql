-- Story 13.3: Impersonation MiKL — support/debug client
-- Ajoute 'operator_impersonation' à activity_logs.actor_type
-- Crée la table impersonation_sessions pour le suivi

-- 1. Update CHECK constraint on activity_logs.actor_type
ALTER TABLE activity_logs
  DROP CONSTRAINT IF EXISTS activity_logs_actor_type_check;
ALTER TABLE activity_logs
  ADD CONSTRAINT activity_logs_actor_type_check
  CHECK (actor_type IN ('client', 'operator', 'system', 'elio', 'elio_one_plus', 'operator_impersonation'));

-- 2. Create impersonation_sessions table
CREATE TABLE IF NOT EXISTS impersonation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  client_auth_user_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'ended')),
  actions_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indexes
CREATE INDEX idx_impersonation_sessions_operator ON impersonation_sessions(operator_id);
CREATE INDEX idx_impersonation_sessions_client ON impersonation_sessions(client_id);
CREATE INDEX idx_impersonation_sessions_status ON impersonation_sessions(status) WHERE status = 'active';

-- 4. Updated_at trigger
CREATE TRIGGER trg_impersonation_sessions_updated_at
  BEFORE UPDATE ON impersonation_sessions
  FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

-- 5. RLS
ALTER TABLE impersonation_sessions ENABLE ROW LEVEL SECURITY;

-- Operators can see all sessions
CREATE POLICY impersonation_sessions_select_operator
  ON impersonation_sessions FOR SELECT
  USING (is_operator());

-- Operators can create sessions
CREATE POLICY impersonation_sessions_insert_operator
  ON impersonation_sessions FOR INSERT
  WITH CHECK (is_operator());

-- Operators can update sessions (end them)
CREATE POLICY impersonation_sessions_update_operator
  ON impersonation_sessions FOR UPDATE
  USING (is_operator());

-- Clients can see their own sessions (for support-history page)
CREATE POLICY impersonation_sessions_select_client
  ON impersonation_sessions FOR SELECT
  USING (client_auth_user_id = auth.uid());

-- 6. Email template for impersonation notification
INSERT INTO email_templates (template_key, subject, body, variables)
VALUES (
  'operator-impersonation-started',
  'Session support MiKL sur ton compte',
  'Bonjour {prenom},

MiKL s''est connecté à ton compte pour te fournir un support technique.

Toutes les actions effectuées durant cette session sont enregistrées et consultables dans tes paramètres, section "Historique support".

Tu peux consulter l''historique complet à tout moment sur /settings/support-history.

L''équipe MonprojetPro',
  ARRAY['prenom']
) ON CONFLICT (template_key) DO NOTHING;

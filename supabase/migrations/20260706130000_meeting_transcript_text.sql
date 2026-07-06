-- Migration: Transcripts visio → mémoire des Élio (chantier Élio Hub — T5 Pilotage, 2026-07-06)
--
-- 1. meeting_recordings.transcript_text + transcript_synced_at : texte brut du transcript
--    (récupéré via l'API Google Docs par syncMeetingResults, tronqué à ~50 000 caractères).
--    Nourrit Élio Hub (outil get_client_activity) et Élio One (contexte « Dernières séances
--    de coaching »).
--
-- 2. Fix RLS opérateur (pré-requis du point 1) : les policies opérateur de meetings et
--    meeting_recordings comparaient meetings.operator_id à auth.uid(), alors que
--    meetings.operator_id référence operators.id (uuid généré ≠ auth_user_id).
--    → l'opérateur ne pouvait NI lire NI écrire ces tables (bug latent, jamais vu car la
--    table meetings est vide en prod à ce jour). Cf. leçon « RLS opérateur = is_operator() ».
--    Les branches owner (client) et service_role sont conservées à l'identique.

-- ── 1. Colonnes transcript texte ─────────────────────────────────────────────

ALTER TABLE meeting_recordings
  ADD COLUMN IF NOT EXISTS transcript_text TEXT,
  ADD COLUMN IF NOT EXISTS transcript_synced_at TIMESTAMPTZ;

COMMENT ON COLUMN meeting_recordings.transcript_text IS
  'Texte brut du transcript Google Docs (tronqué à ~50 000 caractères). Nourrit Élio Hub (get_client_activity) et Élio One (contexte coaching).';
COMMENT ON COLUMN meeting_recordings.transcript_synced_at IS
  'Date de récupération du texte du transcript via l''API Google Docs.';

-- ── 2a. Fix policy SELECT meetings (branche opérateur) ───────────────────────
-- Prod actuelle : meetings_select_merged avec operator_id = auth.uid() (cassé).

DROP POLICY IF EXISTS meetings_select_merged ON meetings;
DROP POLICY IF EXISTS meetings_select_operator ON meetings;
DROP POLICY IF EXISTS meetings_select_owner ON meetings;

CREATE POLICY meetings_select_merged ON meetings FOR SELECT
  USING (
    is_operator(operator_id)
    OR client_id IN (
      SELECT id FROM clients WHERE auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS meetings_update_operator ON meetings;

CREATE POLICY meetings_update_operator ON meetings FOR UPDATE
  USING (is_operator(operator_id))
  WITH CHECK (is_operator(operator_id));

-- ── 2b. Fix policies meeting_recordings (branche opérateur) ──────────────────
-- Prod actuelle : *_merged avec meetings.operator_id = auth.uid() (cassé).

DROP POLICY IF EXISTS meeting_recordings_select_merged ON meeting_recordings;
DROP POLICY IF EXISTS meeting_recordings_select_owner ON meeting_recordings;
DROP POLICY IF EXISTS meeting_recordings_select_operator ON meeting_recordings;

CREATE POLICY meeting_recordings_select_merged ON meeting_recordings FOR SELECT
  USING (
    meeting_id IN (SELECT id FROM meetings WHERE is_operator(operator_id))
    OR meeting_id IN (
      SELECT id FROM meetings WHERE client_id IN (
        SELECT id FROM clients WHERE auth_user_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS meeting_recordings_insert_merged ON meeting_recordings;
DROP POLICY IF EXISTS meeting_recordings_insert_service ON meeting_recordings;
DROP POLICY IF EXISTS meeting_recordings_insert_operator ON meeting_recordings;

CREATE POLICY meeting_recordings_insert_merged ON meeting_recordings FOR INSERT
  WITH CHECK (
    meeting_id IN (SELECT id FROM meetings WHERE is_operator(operator_id))
    OR (SELECT auth.role()) = 'service_role'
  );

DROP POLICY IF EXISTS meeting_recordings_update_merged ON meeting_recordings;
DROP POLICY IF EXISTS meeting_recordings_update_service ON meeting_recordings;
DROP POLICY IF EXISTS meeting_recordings_update_operator ON meeting_recordings;

CREATE POLICY meeting_recordings_update_merged ON meeting_recordings FOR UPDATE
  USING (
    meeting_id IN (SELECT id FROM meetings WHERE is_operator(operator_id))
    OR (SELECT auth.role()) = 'service_role'
  )
  WITH CHECK (
    meeting_id IN (SELECT id FROM meetings WHERE is_operator(operator_id))
    OR (SELECT auth.role()) = 'service_role'
  );

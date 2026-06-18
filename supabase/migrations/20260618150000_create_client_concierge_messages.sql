-- Élio Concierge vivant (LOT F, Incrément 1) — « le dernier mot d'Élio » par client.
--
-- Au lieu d'un bandeau d'état figé (arbre de phrases en dur), chaque événement du parcours
-- (réouverture d'un agent, validation, refus, soumission…) génère un message sur-mesure rédigé
-- par Élio (IA Haiku via l'Edge Function elio-chat), stocké ici. Le bandeau « Mon Parcours »
-- lit le dernier message (via getParcours) ; fallback sur les phrases d'état s'il n'y en a aucun.

CREATE TABLE client_concierge_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,              -- ex: 'agent_reopened'
  agent_label TEXT,                      -- nom de l'agent concerné (si applicable)
  body TEXT NOT NULL,                    -- le mot d'Élio (1-2 phrases, tutoiement)
  source TEXT NOT NULL DEFAULT 'ai'
    CHECK (source IN ('ai', 'template')),-- 'template' = fallback si l'IA a échoué
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_concierge_messages_client_created
  ON client_concierge_messages(client_id, created_at DESC);

-- RLS
ALTER TABLE client_concierge_messages ENABLE ROW LEVEL SECURITY;

-- Le client lit SES propres messages (résolution via clients.auth_user_id).
CREATE POLICY concierge_messages_select_owner ON client_concierge_messages
  FOR SELECT
  TO authenticated
  USING (client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid()));

-- L'opérateur lit tout.
CREATE POLICY concierge_messages_select_operator ON client_concierge_messages
  FOR SELECT
  USING (is_operator());

-- INSERT : opérateur (déclencheur des événements Hub) OU le client pour SON propre parcours
-- (futurs événements déclenchés côté client). Empêche un client de polluer le bandeau d'un autre.
CREATE POLICY concierge_messages_insert_scoped ON client_concierge_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_operator()
    OR client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  );

-- Realtime : on réutilise le broadcast parcours (RSC-009 — la RLS par sous-requête bloque
-- postgres_changes ; le broadcast DB pousse un simple signal de refetch sur parcours:{client_id}).
-- À l'INSERT d'un mot d'Élio, le client re-fetch getParcours → le mot apparaît en direct.
DROP TRIGGER IF EXISTS trg_broadcast_concierge_messages ON public.client_concierge_messages;
CREATE TRIGGER trg_broadcast_concierge_messages
  AFTER INSERT ON public.client_concierge_messages
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_parcours_change();

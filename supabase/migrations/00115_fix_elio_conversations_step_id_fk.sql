-- Migration 00115 — Fix FK elio_conversations.step_id
-- Le nouveau système utilise client_parcours_agents.id comme step_id,
-- mais la contrainte FK pointait vers parcours_steps(id) → violation FK → chat inaccessible.
-- Solution : supprimer la FK (UUID libre) + mettre à jour la policy RLS.

-- 1. Supprimer la contrainte FK vers parcours_steps
ALTER TABLE elio_conversations
  DROP CONSTRAINT IF EXISTS elio_conversations_step_id_fkey;

-- 2. Supprimer l'ancienne policy RLS qui vérifiait via parcours_steps
DROP POLICY IF EXISTS "elio_conversations_insert_step_owner" ON elio_conversations;

-- 3. Nouvelle policy RLS : accepte les deux systèmes (client_parcours_agents + parcours_steps)
CREATE POLICY "elio_conversations_insert_step_owner"
  ON elio_conversations FOR INSERT
  WITH CHECK (
    step_id IS NULL
    OR EXISTS (
      SELECT 1 FROM client_parcours_agents cpa
      WHERE cpa.id = step_id
        AND cpa.client_id IN (
          SELECT id FROM clients WHERE auth_user_id = auth.uid()
        )
    )
    OR EXISTS (
      SELECT 1
      FROM parcours_steps ps
      JOIN parcours p ON p.id = ps.parcours_id
      JOIN clients c ON c.id = p.client_id
      WHERE ps.id = step_id
        AND c.auth_user_id = auth.uid()
    )
  );

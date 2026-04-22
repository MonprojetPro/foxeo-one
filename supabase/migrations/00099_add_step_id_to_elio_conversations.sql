-- Migration 00099: Add step_id to elio_conversations
-- Story 14.4 — Chat Élio embarqué dans la page étape
-- Lie une conversation Élio à une étape spécifique du parcours client.

ALTER TABLE elio_conversations
  ADD COLUMN step_id UUID REFERENCES parcours_steps(id) ON DELETE SET NULL;

CREATE INDEX idx_elio_conversations_step_id ON elio_conversations(step_id);

COMMENT ON COLUMN elio_conversations.step_id IS 'FK vers parcours_steps — lie la conversation à une étape spécifique du parcours. NULL = conversation générale.';

-- Politique RLS : un client ne peut créer une conversation sur un step_id
-- que s'il est le propriétaire de ce step (via parcours → client → auth_user_id).
-- Nécessite la suppression de la politique INSERT existante si elle ne couvre pas step_id.
-- Note : la politique INSERT existante vérifie auth.uid() = user_id.
-- On ajoute ici une protection supplémentaire via une policy dédiée step_id.
CREATE POLICY "elio_conversations_insert_step_owner"
  ON elio_conversations FOR INSERT
  WITH CHECK (
    step_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM parcours_steps ps
      JOIN parcours p ON p.id = ps.parcours_id
      JOIN clients c ON c.id = p.client_id
      WHERE ps.id = step_id
        AND c.auth_user_id = auth.uid()
    )
  );

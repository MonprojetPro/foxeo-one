-- Story 13.3 (correctif 2026-07-25) — Le client (donc l'opérateur en impersonation)
-- doit pouvoir CLORE sa propre session d'impersonation.
--
-- 00087 n'avait créé que des policies UPDATE pour les opérateurs. Résultat : le bouton
-- « Fermer la session » de la bannière exécutait un UPDATE filtré par la RLS → 0 ligne
-- modifiée, aucune erreur remontée, session éternellement « active » en base. Effet de
-- bord : startImpersonation refusait ensuite toute nouvelle session pour ce client
-- (erreur CONFLICT « Une session impersonation est déjà active »).
--
-- Périmètre volontairement étroit : uniquement SA session, et uniquement pour la
-- clore (status doit rester différent de 'active' après coup).

CREATE POLICY impersonation_sessions_update_client
  ON impersonation_sessions FOR UPDATE
  USING (client_auth_user_id = (SELECT auth.uid()))
  WITH CHECK (
    client_auth_user_id = (SELECT auth.uid())
    AND status IN ('ended', 'expired')
  );

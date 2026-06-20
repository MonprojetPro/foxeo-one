-- Fix RLS opérateur — fn_get_operator_id() est cassé (renvoie toujours NULL)
--
-- Cause : fn_get_operator_id() lit auth.users.raw_app_meta_data->>'operator_id', qui n'est
-- renseigné pour AUCUN opérateur. Les policies qui s'appuient dessus ne matchaient donc jamais
-- côté opérateur → le Hub ne pouvait lire ni step_submissions ni activity_logs de ses clients
-- (onglet « Soumissions » vide, « dernière activité » erronée, historique inaccessible).
--
-- Solution : basculer sur is_operator() — le mécanisme prouvé déjà utilisé par les policies
-- de `clients` et `validation_requests` (vérifie l'appartenance via la table `operators`,
-- auth_user_id = auth.uid()). Aucune autre sémantique modifiée (WITH CHECK restent NULL).

-- ── step_submissions : lecture (opérateur du client OU le client lui-même) ──
DROP POLICY IF EXISTS step_submissions_select_merged ON public.step_submissions;
CREATE POLICY step_submissions_select_merged ON public.step_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = step_submissions.client_id
        AND (is_operator(c.operator_id) OR c.auth_user_id = (SELECT auth.uid()))
    )
  );

-- ── step_submissions : mise à jour (opérateur du client) ──
DROP POLICY IF EXISTS step_submissions_update_operator ON public.step_submissions;
CREATE POLICY step_submissions_update_operator ON public.step_submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = step_submissions.client_id
        AND is_operator(c.operator_id)
    )
  );

-- ── activity_logs : lecture (logs des clients de l'opérateur OU actions de l'opérateur) ──
DROP POLICY IF EXISTS activity_logs_select_operator ON public.activity_logs;
CREATE POLICY activity_logs_select_operator ON public.activity_logs
  FOR SELECT USING (
    ((entity_type = 'client') AND (entity_id IN (
      SELECT clients.id FROM public.clients WHERE is_operator(clients.operator_id)
    )))
    OR (actor_id IN (
      SELECT operators.id FROM public.operators WHERE operators.auth_user_id = (SELECT auth.uid())
    ))
    OR ((actor_type = 'client') AND (actor_id IN (
      SELECT clients.id FROM public.clients WHERE is_operator(clients.operator_id)
    )))
  );

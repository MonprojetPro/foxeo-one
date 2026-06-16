-- Sécurité (fuite inter-clients) : la policy SELECT `documents_select_merged` autorisait
-- la lecture de TOUT document `visibility='shared'` SANS vérifier son propriétaire. Un client
-- connecté pouvait donc lire les documents partagés des AUTRES clients via l'API directe
-- (PostgREST), même si l'app filtre par client_id côté requête.
--
-- Correctif : la branche "shared" est restreinte aux documents appartenant au client courant.
-- - La branche serveur `app.client_id` (contexte service) est conservée à l'identique.
-- - Les opérateurs (Hub) ne sont PAS affectés : ils passent par la policy séparée
--   `documents_select_operator` (les policies permissives sont combinées en OR).
-- - auth.uid() est encapsulé dans un SELECT (cache initplan, perf — cf. 00140).

ALTER POLICY documents_select_merged ON public.documents
USING (
  ((client_id = (SELECT current_setting('app.client_id'::text, true))::uuid) AND (deleted_at IS NULL))
  OR
  ((visibility = 'shared') AND (deleted_at IS NULL)
   AND (client_id IN (SELECT id FROM public.clients WHERE auth_user_id = (SELECT auth.uid()))))
);

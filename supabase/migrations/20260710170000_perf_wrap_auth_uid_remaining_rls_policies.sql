-- Perf (advisor 0003_auth_rls_initplan) : envelopper auth.uid() dans un
-- sous-select pour que Postgres l'évalue UNE fois (initplan) au lieu d'une fois
-- par ligne. Logique inchangée, seule la forme de l'appel change.
-- 8 policies sur 5 tables (concierge, tool_posts, tool_post_comments, coaching, billable).
--
-- Complète 00136_perf_wrap_auth_calls_in_rls_policies (qui avait traité le reste) :
-- ces 8 policies ont été créées APRÈS 00136 et n'avaient donc pas le wrapping.

-- billable_items
ALTER POLICY billable_items_select_owner ON public.billable_items
  USING (client_id = ( SELECT clients.id FROM clients WHERE (clients.auth_user_id = (select auth.uid()))));

-- client_concierge_messages
ALTER POLICY concierge_messages_insert_scoped ON public.client_concierge_messages
  WITH CHECK (is_operator() OR (client_id IN ( SELECT clients.id FROM clients WHERE (clients.auth_user_id = (select auth.uid())))));

ALTER POLICY concierge_messages_select_owner ON public.client_concierge_messages
  USING (client_id IN ( SELECT clients.id FROM clients WHERE (clients.auth_user_id = (select auth.uid()))));

-- coaching_credit_ledger
ALTER POLICY coaching_credit_ledger_select_owner ON public.coaching_credit_ledger
  USING (client_id IN ( SELECT clients.id FROM clients WHERE (clients.auth_user_id = (select auth.uid()))));

-- tool_posts
ALTER POLICY tool_posts_select_client ON public.tool_posts
  USING (client_id IN ( SELECT clients.id FROM clients WHERE (clients.auth_user_id = (select auth.uid()))));

-- tool_post_comments
ALTER POLICY tool_post_comments_insert_client ON public.tool_post_comments
  WITH CHECK ((author_type = 'client'::text) AND (author_id = (select auth.uid())) AND (client_id IN ( SELECT clients.id FROM clients WHERE (clients.auth_user_id = (select auth.uid())))) AND (post_id IN ( SELECT tp.id FROM (tool_posts tp JOIN clients c ON ((c.id = tp.client_id))) WHERE (c.auth_user_id = (select auth.uid())))));

ALTER POLICY tool_post_comments_insert_operator ON public.tool_post_comments
  WITH CHECK ((author_type = 'operator'::text) AND (author_id = (select auth.uid())) AND (client_id IN ( SELECT c.id FROM clients c WHERE is_operator(c.operator_id))));

ALTER POLICY tool_post_comments_select_client ON public.tool_post_comments
  USING (client_id IN ( SELECT clients.id FROM clients WHERE (clients.auth_user_id = (select auth.uid()))));

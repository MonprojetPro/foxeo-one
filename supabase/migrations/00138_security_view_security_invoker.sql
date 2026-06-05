-- Sécurité : security_definer_view (seul ERROR du linter)
-- La vue analytics agrège le CA par module sur les clients. En SECURITY DEFINER, elle
-- s'exécutait avec les droits de son créateur (contournait la RLS de l'appelant).
-- security_invoker = on : la RLS de l'utilisateur qui interroge s'applique désormais.
-- Effet : la vue est scopée aux clients de l'opérateur courant (correct en multi-opérateur).
alter view public.v_module_catalog_analytics set (security_invoker = on);

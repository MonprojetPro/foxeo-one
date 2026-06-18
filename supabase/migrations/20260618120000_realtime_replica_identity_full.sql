-- Realtime : REPLICA IDENTITY FULL pour les tables dont les events UPDATE/DELETE
-- sont filtrés / soumis à RLS sur une colonne HORS clé primaire (client_id, parcours_step_id).
--
-- Contexte (RSC-009) : postgres_changes ne peut filtrer ni évaluer une RLS sur un UPDATE/DELETE
-- que sur les colonnes présentes dans la REPLICA IDENTITY. En `default` (PK seule), l'ancien
-- tuple ne contient que `id` → le filtre `client_id=eq...` et les policies RLS référençant
-- client_id échouent silencieusement → l'event n'est JAMAIS délivré au client (canal pourtant
-- SUBSCRIBED). Symptôme observé : couper un agent du parcours ne se voyait qu'après rechargement.
--
-- Les events INSERT ne sont pas concernés (le nouveau tuple est toujours complet) — d'où le fait
-- que notifications/messages (live = INSERT) fonctionnaient déjà.
--
-- FULL journalise l'ancien tuple complet sur UPDATE/DELETE : surcoût WAL négligeable sur ces
-- tables à faible volume d'écriture. Réversible via `REPLICA IDENTITY DEFAULT`.

ALTER TABLE public.client_parcours_agents REPLICA IDENTITY FULL;
ALTER TABLE public.parcours REPLICA IDENTITY FULL;
ALTER TABLE public.step_submissions REPLICA IDENTITY FULL;
ALTER TABLE public.client_configs REPLICA IDENTITY FULL;

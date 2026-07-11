-- Migration — notifications : REPLICA IDENTITY FULL
--
-- Cause : la table notifications est bien dans la publication supabase_realtime,
--   mais avec REPLICA IDENTITY par défaut (PK seulement). Conséquence : les
--   événements DELETE et UPDATE filtrés côté client par `recipient_id=eq.<id>`
--   ne sont PAS délivrés — le `old` record d'un DELETE ne contient que la PK
--   (`id`), donc le filtre sur `recipient_id` ne matche jamais et l'événement
--   est ignoré par Realtime.
--
-- Besoin : l'auto-résolution des alertes système (health-check-cron supprime
--   l'alerte cloche quand un service redevient opérationnel) doit se refléter
--   EN DIRECT dans la cloche, sans refresh. Idem pour le marquage lu (UPDATE).
--
-- Fix : passer la table en REPLICA IDENTITY FULL → le `old` record complet est
--   émis au WAL, le filtre recipient_id matche sur DELETE/UPDATE. Coût WAL
--   négligeable (table à faible volume). Couplé à l'écoute UPDATE/DELETE ajoutée
--   dans use-notifications-realtime.ts.

ALTER TABLE public.notifications REPLICA IDENTITY FULL;

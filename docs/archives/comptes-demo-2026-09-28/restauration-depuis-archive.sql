-- ============================================================================
-- RESTAURATION DES 3 COMPTES DE DEMONSTRATION — depuis le schema d'archive
-- Item board T-034 · archive du 2026-09-28
-- ============================================================================
--
-- CE QUE FAIT CE FICHIER
-- Il recopie, du schema `archive_demo_2026_09_28` vers `public`, les 728 lignes
-- des 3 clients de demonstration supprimes le 2026-09-28 (Atelier Reynaud,
-- Maison Vasseur, Le Comptoir de Camille).
--
-- PREREQUIS ABSOLU — A FAIRE AVANT, SINON TOUT ECHOUE
--   1. Le schema `archive_demo_2026_09_28` doit exister. Verifier :
--        select count(*) from archive_demo_2026_09_28.clients;   -- attendu : 3
--      S'il a disparu (projet Supabase recree), utiliser `donnees-completes.sql`.
--   2. Les 3 comptes `auth.users` doivent avoir ete recrees AVEC LEURS UUID
--      D'ORIGINE. La procedure est dans README.md, section 4, etape 1.
--      `clients.auth_user_id` pointe dessus : sans eux, le premier INSERT echoue.
--
-- IDEMPOTENCE
-- Chaque insertion porte `on conflict do nothing`. Rejouer ce fichier ne cree
-- aucun doublon et ne remonte aucune erreur. C'est voulu : on doit pouvoir le
-- relancer apres l'avoir interrompu.
--
-- ORDRE DES INSERTIONS
-- Il n'est pas alphabetique, il suit les dependances de cles etrangeres.
-- Ne pas le reordonner : `documents` a besoin de `document_folders`,
-- `parcours_steps` de `parcours`, `tool_post_comments` de `tool_posts`,
-- `elio_messages` et `elio_token_usage` de `elio_conversations`.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. La fiche client elle-meme
-- ---------------------------------------------------------------------------
insert into public.clients select * from archive_demo_2026_09_28.clients
  on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Configuration et notes
-- ---------------------------------------------------------------------------
insert into public.client_configs select * from archive_demo_2026_09_28.client_configs
  on conflict do nothing;
insert into public.client_notes select * from archive_demo_2026_09_28.client_notes
  on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 3. Parcours Lab — le parcours avant ses etapes, les etapes avant les agents
-- ---------------------------------------------------------------------------
insert into public.parcours select * from archive_demo_2026_09_28.parcours
  on conflict do nothing;
insert into public.parcours_steps select * from archive_demo_2026_09_28.parcours_steps
  on conflict do nothing;
insert into public.client_parcours_agents select * from archive_demo_2026_09_28.client_parcours_agents
  on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 4. Soumissions d'etape, validations, retours injectes
--    step_feedback_injections apres step_submissions : il s'y rattache
-- ---------------------------------------------------------------------------
insert into public.step_submissions select * from archive_demo_2026_09_28.step_submissions
  on conflict do nothing;
insert into public.validation_requests select * from archive_demo_2026_09_28.validation_requests
  on conflict do nothing;
insert into public.step_feedback_injections select * from archive_demo_2026_09_28.step_feedback_injections
  on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 5. Documents — les dossiers d'abord, puis les fichiers
--    Note : `document_folders` a une cle etrangere vers lui-meme (`parent_id`),
--    mais les 4 dossiers archives sont tous a la racine (`parent_id` NULL,
--    verifie en base le 28-09). Aucun ordre particulier n'est donc necessaire.
--    Si un jour l'archive contient des sous-dossiers, il faudra inserer les
--    parents avant les enfants.
-- ---------------------------------------------------------------------------
insert into public.document_folders select * from archive_demo_2026_09_28.document_folders
  on conflict do nothing;
insert into public.documents select * from archive_demo_2026_09_28.documents
  on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 6. Relation : messages, reunions, tickets, rappels, consentements
-- ---------------------------------------------------------------------------
insert into public.messages select * from archive_demo_2026_09_28.messages
  on conflict do nothing;
insert into public.meetings select * from archive_demo_2026_09_28.meetings
  on conflict do nothing;
insert into public.support_tickets select * from archive_demo_2026_09_28.support_tickets
  on conflict do nothing;
insert into public.reminders select * from archive_demo_2026_09_28.reminders
  on conflict do nothing;
insert into public.collection_reminders select * from archive_demo_2026_09_28.collection_reminders
  on conflict do nothing;
insert into public.consents select * from archive_demo_2026_09_28.consents
  on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 7. Cockpit One : publications d'outils, puis leurs commentaires
-- ---------------------------------------------------------------------------
insert into public.tool_posts select * from archive_demo_2026_09_28.tool_posts
  on conflict do nothing;
insert into public.tool_post_comments select * from archive_demo_2026_09_28.tool_post_comments
  on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 8. Elio — conversations avant messages, et avant la consommation de jetons
--    (elio_token_usage pointe vers conversation_id ET client_id)
-- ---------------------------------------------------------------------------
insert into public.elio_conversations select * from archive_demo_2026_09_28.elio_conversations
  on conflict do nothing;
insert into public.elio_messages select * from archive_demo_2026_09_28.elio_messages
  on conflict do nothing;
insert into public.elio_token_usage select * from archive_demo_2026_09_28.elio_token_usage
  on conflict do nothing;
insert into public.client_concierge_messages select * from archive_demo_2026_09_28.client_concierge_messages
  on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 9. Notifications et preferences (rattachees a auth.users, pas a clients)
-- ---------------------------------------------------------------------------
insert into public.notifications select * from archive_demo_2026_09_28.notifications
  on conflict do nothing;
insert into public.notification_preferences select * from archive_demo_2026_09_28.notification_preferences
  on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 10. Traces : impersonation, journal d'activite, tentatives de connexion
--     Purement historique. Si tu ne veux pas re-polluer les journaux, tu peux
--     sauter cette section : rien d'autre n'en depend.
-- ---------------------------------------------------------------------------
insert into public.impersonation_sessions select * from archive_demo_2026_09_28.impersonation_sessions
  on conflict do nothing;
insert into public.activity_logs select * from archive_demo_2026_09_28.activity_logs
  on conflict do nothing;
insert into public.login_attempts select * from archive_demo_2026_09_28.login_attempts
  on conflict do nothing;

commit;

-- ============================================================================
-- CE QUE CE SCRIPT NE RESTAURE PAS, ET C'EST VOLONTAIRE
-- Le schema d'archive contient 3 tables de plus, prefixees `orphelins_` :
--   · orphelins_notification_preferences (44 lignes)
--   · orphelins_activity_logs            (8 lignes)
--   · orphelins_activity_logs_entites    (135 lignes)
-- Ce sont des residus d'anciens comptes supprimes AVANT ceux-ci, et des lignes
-- de journal visant des entites disparues. Ils ont ete trouves en verifiant la
-- purge, archives par precaution, et supprimes. Remettre les 3 comptes de demo
-- ne doit pas ramener les dechets d'autres comptes : ils ne sont donc pas ici.
-- Si tu en as vraiment besoin un jour, ils sont dans le schema d'archive.
-- ============================================================================

-- ============================================================================
-- CONTROLE — ne pas se contenter de l'absence d'erreur, recompter
-- ============================================================================
--   select 'clients' t, count(*) n from public.clients where is_demo
--   union all select 'step_submissions', count(*) from public.step_submissions
--     where client_id in (select id from archive_demo_2026_09_28.clients)
--   union all select 'validation_requests', count(*) from public.validation_requests
--     where client_id in (select id from archive_demo_2026_09_28.clients)
--   union all select 'elio_messages', count(*) from public.elio_messages m
--     join public.elio_conversations c on c.id = m.conversation_id
--     where c.user_id in (select id from archive_demo_2026_09_28.auth_users);
--   -- Attendu : 3, 30, 30, 146
--
-- PUIS : la comptabilite de demo, si tu la veux aussi, et SEULEMENT maintenant
-- que les clients existent -> ../donnees-demo-compta-2026-09-17.sql
-- (lire son avertissement : jamais sur une base portant de vraies ecritures
--  sans avoir verifie les numeros de facture)
-- ============================================================================

-- ============================================================================
-- EXPORTER L'ARCHIVE EN UN FICHIER SQL AUTONOME
-- Item board T-034 · archive du 2026-09-28
-- ============================================================================
--
-- LE PROBLEME QUE CE FICHIER RESOUD
-- L'archive des 3 comptes de demonstration vit dans la base, dans le schema
-- `archive_demo_2026_09_28`. C'est une copie exacte, sans conversion ni perte.
-- Mais elle a une limite : elle est DANS la base. Si le projet Supabase est un
-- jour perdu, reinitialise ou recree, elle disparait avec lui.
--
-- Ce fichier fabrique la copie hors-base. Il ne copie rien lui-meme : il
-- GENERE le texte d'un script de restauration complet, que tu telecharges.
--
-- POURQUOI CE N'EST PAS DEJA FAIT, ET POURQUOI C'EST A TOI DE LE FAIRE
-- Recopier 728 lignes de donnees a la main depuis une console vers un fichier,
-- c'est prendre le risque d'une archive corrompue qui a l'air saine — le pire
-- des cas, puisqu'on ne le decouvre qu'au moment ou on en a besoin. La base
-- ecrit le fichier elle-meme, sans intermediaire : zero risque de transcription.
--
-- MODE D'EMPLOI — 3 minutes
--   1. Tableau de bord Supabase -> SQL Editor.
--   2. Coller tout ce fichier, executer.
--   3. La derniere requete rend UNE seule cellule de texte : c'est le script
--      complet. Bouton « Download CSV », ou clic dans la cellule puis copier.
--   4. Enregistrer sous :
--      docs/archives/comptes-demo-2026-09-28/donnees-completes.sql
--      et committer. C'est fait.
--
-- QUAND LE FAIRE
--   · Maintenant, si tu veux la ceinture ET les bretelles.
--   · Obligatoirement AVANT toute migration, reinitialisation ou recreation du
--     projet Supabase — apres, il sera trop tard.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- La fonction de generation.
-- Elle parcourt les tables dans l'ordre des dependances de cles etrangeres
-- (pas l'alphabet) et produit un bloc `json_populate_recordset` par table.
--
-- Pourquoi cette forme et pas des `INSERT ... VALUES (...)` :
-- `json_populate_recordset` associe les valeurs aux colonnes PAR LEUR NOM.
-- Le script reste donc valable meme si le schema evolue — une colonne ajoutee
-- depuis arrivera a NULL, une colonne supprimee sera ignoree. Un INSERT
-- positionnel, lui, casserait des la premiere migration.
-- ---------------------------------------------------------------------------
create or replace function archive_demo_2026_09_28.exporter_sql()
returns text
language plpgsql
as $fn$
declare
  -- ORDRE IMPOSE PAR LES CLES ETRANGERES — ne pas reordonner.
  -- clients d'abord ; parcours avant parcours_steps ; document_folders avant
  -- documents ; tool_posts avant tool_post_comments ; elio_conversations avant
  -- elio_messages et elio_token_usage.
  tables text[] := array[
    'clients', 'client_configs', 'client_notes',
    'parcours', 'parcours_steps', 'client_parcours_agents',
    'step_submissions', 'validation_requests', 'step_feedback_injections',
    'document_folders', 'documents',
    'messages', 'meetings', 'support_tickets',
    'reminders', 'collection_reminders', 'consents',
    'tool_posts', 'tool_post_comments',
    'elio_conversations', 'elio_messages', 'elio_token_usage',
    'client_concierge_messages',
    'notifications', 'notification_preferences',
    'impersonation_sessions', 'activity_logs', 'login_attempts'
  ];
  t        text;
  donnees  text;
  nb       bigint;
  sortie   text;
begin
  sortie :=
    '-- ==========================================================================' || E'\n' ||
    '-- DONNEES COMPLETES DES 3 COMPTES DE DEMONSTRATION — copie autonome' || E'\n' ||
    '-- Item board T-034 · archive du 2026-09-28' || E'\n' ||
    '-- Fichier GENERE par archive_demo_2026_09_28.exporter_sql()' || E'\n' ||
    '-- ==========================================================================' || E'\n' ||
    '--' || E'\n' ||
    '-- PREREQUIS : les 3 comptes auth.users doivent exister AVEC LEURS UUID' || E'\n' ||
    '-- D ORIGINE, et l operateur 00000000-0000-0000-0000-000000000001 aussi.' || E'\n' ||
    '-- Procedure : README.md du meme dossier, section 4, etape 1.' || E'\n' ||
    '--' || E'\n' ||
    '-- NE CONTIENT PAS : aucune empreinte de mot de passe, aucun fichier de' || E'\n' ||
    '-- storage (les 57 objets sont restes dans les buckets prives — voir README).' || E'\n' ||
    '--' || E'\n' ||
    '-- IDEMPOTENT : `on conflict do nothing` partout, rejouable sans doublon.' || E'\n' ||
    '-- ORDRE DES BLOCS : impose par les cles etrangeres. Ne pas reordonner.' || E'\n' ||
    '-- ==========================================================================' || E'\n\n' ||
    'begin;' || E'\n';

  foreach t in array tables loop
    execute format(
      'select coalesce(json_agg(row_to_json(x))::text, ''[]''), count(*) from archive_demo_2026_09_28.%I x', t
    ) into donnees, nb;

    sortie := sortie || E'\n'
      || format('-- %s — %s ligne(s)', t, nb) || E'\n'
      || format(
           'insert into public.%I select * from json_populate_recordset(null::public.%I, $donnees$%s$donnees$::json) on conflict do nothing;',
           t, t, donnees
         ) || E'\n';
  end loop;

  -- Les comptes de connexion : identifiants, emails et metadonnees.
  -- Sans empreinte de mot de passe — c'est deliberé, voir le README.
  execute 'select coalesce(json_agg(row_to_json(x))::text, ''[]''), count(*) from archive_demo_2026_09_28.auth_users x'
    into donnees, nb;
  sortie := sortie || E'\n'
    || format('-- auth_users — %s compte(s). NE S INSERE PAS TEL QUEL : voir README section 4 etape 1.', nb) || E'\n'
    || format('-- %s', donnees) || E'\n';

  -- L inventaire des fichiers de storage, a titre de trace.
  execute 'select coalesce(json_agg(row_to_json(x))::text, ''[]''), count(*) from archive_demo_2026_09_28.storage_objects_inventory x'
    into donnees, nb;
  sortie := sortie || E'\n'
    || format('-- storage_objects_inventory — %s objet(s) laisses en place dans les buckets prives.', nb) || E'\n'
    || format('-- %s', donnees) || E'\n';

  sortie := sortie || E'\ncommit;\n';
  return sortie;
end
$fn$;


-- ---------------------------------------------------------------------------
-- LA REQUETE A EXECUTER — elle rend une seule cellule : le script complet.
-- « Download CSV » pour l'enregistrer.
-- ---------------------------------------------------------------------------
select archive_demo_2026_09_28.exporter_sql() as script_de_restauration_complet;


-- Controle rapide, si tu veux verifier avant de telecharger :
--   select length(archive_demo_2026_09_28.exporter_sql()) as octets;
--   -- Mesure reelle du 2026-09-28 : 481 428 octets, 28 blocs `insert into public.`.
--   -- Un resultat nettement plus court signifie qu'une table de l'archive a ete
--   -- vidée ou supprimée — dans ce cas, NE PAS ecraser un export precedent.

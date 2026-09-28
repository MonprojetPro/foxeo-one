# Comptes de démonstration du Hub — archive du 2026-09-28

> Item board : **T-034**. Renverse **T-026** (« les garder et les marquer comme fictifs »).
> Décision de MiKL le 2026-09-28 : *« je voudrais supprimer tous les faux comptes du hub pour
> commencer à inclure de vrais clients et ne pas être pollué [...] par contre j'aimerais que tu notes
> quelque part tout ce qui concerne ces faux clients, comme ça si j'ai besoin à un moment donné ou à
> un autre que tu puisses les réinstaller facilement. Une fois que c'est fait tu supprimes toutes les
> traces et les comptes de ces faux clients, je veux un hub vide. Je créerai bientôt un faux compte
> pour qu'on puisse vérifier que tout le système fonctionne bien. »*

---

## 1. Ce qui a été supprimé

Trois clients de démonstration, leurs trois comptes de connexion, et tout ce qui leur était rattaché.

| Client | UUID `clients.id` | UUID `auth.users.id` | Email de connexion | État au moment de la purge |
|---|---|---|---|---|
| Atelier Reynaud (Thomas Reynaud) | `b2000000-0000-4000-8000-000000000002` | `b2000000-0000-4000-8000-0000000000b2` | `thomas.reynaud@atelier-reynaud.fr` | `active` · projet `completed` |
| Maison Vasseur (Léa Vasseur) | `a1000000-0000-4000-8000-000000000001` | `a1000000-0000-4000-8000-0000000000a1` | `lea.vasseur@maison-vasseur.fr` | `active` · projet `in_progress` |
| Le Comptoir de Camille (Camille Fournier) | `766e2fb1-8b96-42ad-9fed-7faeb0cd541c` | `8c5ed35e-273d-493f-a32a-fb7992256251` | `camille.fournier@comptoir-camille.fr` | `subscription_cancelled` |

Les trois portaient déjà `clients.is_demo = true` (mécanisme posé par la migration
`20260920100000_clients_is_demo.sql`, conservé — il servira au compte de test à venir).

Ont également été purgées les traces d'anciens comptes de test **qui n'existaient plus** dans
`auth.users` mais dont `login_attempts` gardait la mémoire : `dev-client@monprojet-pro.com` (37
tentatives), `mikl@foxeo.io` (33), `culus.osteo+test2@gmail.com` (10), `sophie.dev@monprojetpro.test` (1).

**Seul compte restant après l'opération : `contact@monprojet-pro.com`** (opérateur MiKL,
`operators.id = 00000000-0000-0000-0000-000000000001`).

### Volume exact, table par table

Compté en base avant la purge, et recompté dans l'archive : **29 tables sur 29 concordantes**.

| Table | Lignes |
|---|---|
| `elio_messages` | 146 |
| `elio_token_usage` | 99 |
| `login_attempts` (comptes de test, tous confondus) | 90 |
| `activity_logs` | 56 |
| `step_submissions` | 30 |
| `validation_requests` | 30 |
| `client_parcours_agents` | 28 |
| `messages` | 28 |
| `client_concierge_messages` | 23 |
| `documents` | 23 |
| `elio_conversations` | 23 |
| `step_feedback_injections` | 17 |
| `notification_preferences` | 16 |
| `tool_post_comments` | 12 |
| `consents` | 10 |
| `support_tickets` | 7 |
| `meetings` | 6 |
| `notifications` | 6 |
| `parcours_steps` | 6 |
| `tool_posts` | 5 |
| `document_folders` | 4 |
| `impersonation_sessions` | 4 |
| `auth.users` | 3 |
| `client_configs` | 3 |
| `client_notes` | 3 |
| `clients` | 3 |
| `collection_reminders` | 3 |
| `reminders` | 3 |
| `parcours` | 1 |

**Total : 728 lignes** pour le périmètre des 3 comptes de démonstration.

S'y ajoutent **187 lignes** trouvées en vérifiant, hors du périmètre annoncé : 52 lignes orphelines
d'anciens comptes déjà supprimés et 135 lignes de journal visant des entités disparues. Elles sont
archivées dans les 3 tables `orphelins_*` du schéma d'archive et détaillées au § 6. **Elles ne sont
volontairement PAS dans le script de restauration** : remettre les comptes de démo ne doit pas
ramener les déchets d'autres comptes. **Grand total supprimé : 915 lignes.**

### Ce qui était déjà vide, et n'a donc rien à voir avec cette purge

`api_keys`, `billable_items`, `billing_sync`, `calcom_bookings`, `client_handoffs`,
`client_instances`, `client_lab_exports`, `client_step_contexts`, `coaching_credit_ledger`,
`communication_profiles`, `data_exports`, `elio_config_history`, `elio_configs`,
`instance_transfers`, `quote_metadata`, `user_preferences`.

⚠️ **`billing_sync` était déjà vide** : la comptabilité de démonstration (16 documents + 8 mouvements
de crédits) a été supprimée le **2026-09-17** au titre de T-025, et archivée dans
`docs/archives/donnees-demo-compta-2026-09-17.sql`. **Ce fichier-là suppose que les 3 clients
existent** — il est donc devenu inutilisable seul. Voir la section « Remettre la compta de démo ».

---

## 2. Où est l'archive, exactement

Elle existe à **deux endroits**, volontairement, parce qu'ils ne protègent pas contre la même perte.

### a. Dans la base — schéma `archive_demo_2026_09_28`

Une **copie exacte** de chaque ligne, colonne pour colonne, type pour type, faite par
`create table ... as select ...` avant toute suppression. C'est la source de restauration de
référence : aucune conversion, aucune perte possible.

- Le schéma n'est **pas exposé** à l'API PostgREST, et les droits de `anon` / `authenticated` y ont
  été révoqués. Il est donc invisible depuis le Hub comme depuis l'app client.
- Une table de plus que la liste ci-dessus : `storage_objects_inventory` (57 objets, voir § 3).
- Une table `auth_users` **sans empreinte de mot de passe** — voir § 4.

Vérifier qu'il est toujours là :

```sql
select table_name from information_schema.tables
where table_schema = 'archive_demo_2026_09_28' order by 1;
```

### b. Hors base — une copie fichier, **à générer** par `exporter-archive-en-fichier.sql`

L'archive en base a une limite : elle est *dans* la base. Si le projet Supabase est perdu,
réinitialisé ou recréé, elle disparaît avec lui.

`exporter-archive-en-fichier.sql` fabrique la copie hors base : exécuté dans le SQL Editor de
Supabase, il rend **une seule cellule de texte** contenant un script de restauration complet et
autonome (481 428 octets, 28 blocs `insert`, mesuré le 2026-09-28). Bouton « Download CSV »,
enregistrer sous `donnees-completes.sql` dans ce dossier, committer.

⚠️ **Cette copie n'existe pas encore.** Elle demande une action de ta part, et c'est volontaire :
recopier 728 lignes à la main depuis une console vers un fichier, c'est risquer une archive corrompue
qui a l'air saine — le pire des cas, puisqu'on ne le découvre qu'au moment où on en a besoin. La base
écrit le fichier elle-même, sans intermédiaire.

À faire **obligatoirement avant** toute migration ou recréation du projet Supabase. Après, il sera
trop tard.

---

## 3. Les fichiers du storage — LUS AVANT DE CONCLURE

**Les 57 objets de storage n'ont PAS été supprimés, et c'est délibéré.**

| Bucket | Objets | Poids | Quoi |
|---|---|---|---|
| `documents` | 19 | 800 Ko | Les livrables des parcours de démo (`.md` produits par les agents Élio) + 4 fichiers orphelins sous `66a500b5-…`, résidus d'un client effacé avant celui-ci |
| `screenshots` | 5 | 5,6 Mo | Captures déposées par les clients de démo dans leurs soumissions d'étape |
| `tool-screenshots` | 5 | 570 Ko | Captures des `tool_posts` et de leurs commentaires |
| `backups` | 28 | 72 Ko | Sauvegardes JSON automatiques quotidiennes des fiches client de démo |

**Pourquoi ils restent** — deux raisons, dans cet ordre :

1. **Sans eux, la restauration serait incomplète.** Les 23 lignes de `documents` archivées portent un
   `file_path` qui pointe vers ces fichiers. Les effacer rendrait la restauration capable de remonter
   les fiches, mais avec des documents vides — un archivage qui ment sur ce qu'il conserve.
2. **Je ne peux pas les archiver.** Leur contenu vit dans le stockage objet, pas dans Postgres. Le
   lire exigerait une clé de service à laquelle je n'ai pas accès (et ne dois pas avoir accès). Les
   supprimer serait donc une perte définitive que rien ne rattrape.

**Ils ne polluent rien** : les quatre buckets sont privés, et sans ligne en base plus aucun écran du
Hub ni de l'app client ne les liste ou n'y accède. Le Hub est vide à l'écran.

➡️ **Si tu veux quand même les effacer physiquement**, c'est une action manuelle de ton côté
(tableau de bord Supabase, section Storage) — et il faut savoir qu'à partir de ce moment, la
restauration remontera les fiches et les parcours **sans le contenu des documents**. L'inventaire
complet, chemin par chemin, reste lisible ici :

```sql
select bucket_id, name, (metadata->>'size')::bigint as octets
from archive_demo_2026_09_28.storage_objects_inventory order by bucket_id, name;
```

---

## 4. Comment tout remettre

### Étape 1 — les comptes de connexion

L'archive ne contient **aucune empreinte de mot de passe**, volontairement : une empreinte dans un
dépôt Git est un secret en clair qui ne devrait pas y être. Les trois comptes doivent donc être
recréés **avec leurs UUID d'origine** — c'est non négociable, tout le reste de l'archive y est
rattaché — puis recevoir un mot de passe défini par toi.

```sql
-- Recrée les 3 comptes auth avec leurs UUID exacts et un mot de passe temporaire.
-- A EXECUTER AVANT le reste : clients.auth_user_id y fait référence.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_user_meta_data, raw_app_meta_data
)
select a.id, '00000000-0000-0000-0000-000000000000', a.aud, a.role, a.email,
       crypt('ChangeMoiTOUTDeSuite!2026', gen_salt('bf')),
       coalesce(a.email_confirmed_at, now()), a.created_at, a.updated_at,
       a.raw_user_meta_data, a.raw_app_meta_data
from archive_demo_2026_09_28.auth_users a
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text, 'email',
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       now(), now()
from auth.users u
where u.id in (select id from archive_demo_2026_09_28.auth_users)
  and not exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email');
```

Puis **change les 3 mots de passe** depuis le tableau de bord Supabase (Authentication → Users), ou
laisse les comptes envoyer un lien de réinitialisation.

### Étape 2 — les données

```sql
-- Depuis le schéma d'archive (méthode de référence, fidélité totale) :
\i restauration-depuis-archive.sql

-- OU, si le schéma d'archive n'existe plus (projet Supabase recréé) :
-- le fichier produit par exporter-archive-en-fichier.sql (§ 2.b)
\i donnees-completes.sql
```

Les deux scripts respectent l'ordre des dépendances et sont **idempotents** : rejoués une deuxième
fois ils ne créent pas de doublon (`on conflict do nothing`).

### Étape 3 — remettre la compta de démo (optionnel)

Une fois les clients revenus, et **seulement à ce moment-là** :

```sql
\i ../donnees-demo-compta-2026-09-17.sql
```

⚠️ Ce fichier porte son propre avertissement : ne jamais l'exécuter sur une base contenant de vraies
écritures comptables sans avoir vérifié qu'aucun `pennylane_id` réel ne porte les mêmes numéros de
facture. À la date d'écriture de ce README, la compta réelle est encore vide — mais ce ne sera plus
vrai longtemps, c'est précisément l'objet de la purge.

### Étape 4 — vérifier que la restauration a marché

Ne pas se contenter de l'absence d'erreur : recompter.

```sql
select 'clients' t, count(*) from clients where is_demo
union all select 'step_submissions', count(*) from step_submissions
  where client_id in (select id from archive_demo_2026_09_28.clients)
union all select 'elio_messages', count(*) from elio_messages m
  join elio_conversations c on c.id = m.conversation_id
  where c.user_id in (select id from archive_demo_2026_09_28.auth_users);
-- Attendu : 3, 30, 146
```

---

## 5. Ce qu'il faut savoir avant de recréer un compte de test

- **Marque-le `is_demo = true`.** Le mécanisme est intact et le CRM l'affiche déjà comme fictif
  (`packages/modules/crm/components/client-header.tsx`, `client-list.tsx`). C'est ce qui évitera de
  reconfondre un jour un compte de test avec un vrai client.
- **N'utilise pas d'UUID fabriqué** (`a1000000-…`, `b2000000-…`). Deux des trois comptes de démo en
  portaient, et c'est exactement ce qui a permis de les repérer comme faux — mais c'est aussi ce qui
  rend une fiche impossible à distinguer d'un bug d'insertion quand on la croise sans contexte.
- **Le trigger d'accès Lab permanent s'appliquera aussi à lui** : `lab_mode_available` ne peut pas
  être repassé à `false`. « Couper le Lab » d'un compte de test se fait en désactivant ses agents.

---

## 6. Journal de l'opération

| Étape | Preuve |
|---|---|
| Périmètre relevé en base | Requêtes de comptage sur 24 tables + `auth.users` + `storage.objects` |
| Contraintes de clés étrangères relevées | `pg_constraint` : 2 FK en `NO ACTION` (`billing_sync` vide, `impersonation_sessions` 4 lignes — celle-ci **aurait bloqué** la suppression) et 2 en `SET NULL` (`elio_token_usage`, `reminders` — elles **auraient laissé des orphelins**). Les 4 supprimées explicitement avant la cascade |
| Archive créée | Schéma `archive_demo_2026_09_28` |
| Archive contrôlée **avant** suppression | Comparaison archive vs source : **29 tables sur 29 concordantes** |
| Schéma d'archive verrouillé | `revoke all` sur `anon` et `authenticated` |
| Script de restauration **testé à blanc avant la purge** | Les 28 `insert` joués alors que les données existaient encore : **0 erreur, 0 ligne créée** (totaux identiques avant/après, neutralisés par conflit de clé primaire). Prouve la syntaxe ET l'alignement des colonnes. Vérifié au préalable que les 28 tables ont une clé primaire — sans quoi le test aurait créé des doublons au lieu de ne rien faire |
| Exporteur de fichier testé | `archive_demo_2026_09_28.exporter_sql()` → **481 428 octets, 28 blocs `insert`** |
| Suppression | Instructions explicites pour les 8 tables mal ou non couvertes par la cascade, puis `delete from clients` (cascade), puis `delete from auth.users` |
| Hub vide vérifié | Balayage des **59 tables** de `public` : les 24 tables clients à **0**. Ne restent que la configuration (`elio_lab_agents` 13, `email_templates` 13, `system_config` 12, `module_catalog` 10, `billing_sync_state` 3, `parcours_templates` 1) et le compte de MiKL (`operators` 1, `activity_logs` 237, ses conversations Élio Hub, `login_attempts` 19, intégrations Google) |
| Aucun orphelin résiduel | `auth.identities` / `auth.sessions` visant un compte supprimé : **0**. `activity_logs` mentionnant un client de démo dans ses métadonnées : **0** |
| Storage inchangé | **57 objets toujours présents**, conformément au § 3 |

### Deux trouvailles faites en vérifiant, qui n'étaient pas dans le périmètre annoncé

**① 52 lignes orphelines d'anciens comptes déjà supprimés.** Le recomptage a révélé
`notification_preferences` avec 44 lignes ne se rattachant à **aucun compte existant** (7 UUID morts,
dont `66a500b5-…`, `62f8b5ef-…`, `b67be45e-…`, `9c16a4bf-…`, `1c05f53e-…`, `00000000-…-0010`) et 8
`activity_logs` de même nature. Résidus de clients effacés bien avant celui-ci, jamais nettoyés.
Archivées dans `orphelins_notification_preferences` et `orphelins_activity_logs`, puis supprimées.
À noter : `notification_preferences` est désormais à **0** — MiKL n'en avait aucune de son côté.

**② 135 lignes de journal visant des entités disparues.** 101 `activity_logs` de type `client`
pointant vers des fiches supprimées, plus 30 `quote` et 4 `invoice` datant d'avril 2026, tous
rattachés à la comptabilité de démo purgée le 17-09. Archivées dans
`orphelins_activity_logs_entites`, puis supprimées. **Conservées en revanche** : les 46 `email_sent`
(juillet à septembre, vrais envois) et les 186 `system` — ce sont les traces de ton propre travail,
pas de faux clients.

**③ Un défaut de cohérence à traiter un jour, pas corrigé ici.** Deux chemins de code écrivent un
`clients.id` dans une colonne censée porter un `auth_user_id` : `notification_preferences.user_id` et
`activity_logs.actor_id` portaient tous deux `766e2fb1-…` (l'identifiant de la **fiche client**, pas
du compte). C'est la même famille de piège que « l'opérateur s'identifie par `auth_user_id`, jamais
par l'email » : une comparaison qui ne matche jamais échoue **sans erreur**. Hors périmètre de cette
purge — signalé au board.

### Une observation que je ne peux pas expliquer

Une notification appartenant à **MiKL** (la 7e, les 6 autres étant celles des comptes de démo) était
encore présente au recomptage juste après la purge, et avait disparu quelques minutes plus tard.
**Ce n'est pas une de mes instructions** : `notifications` ne porte aucune clé étrangère, aucun cron
de nettoyage n'existe (`cron.job` vérifié, 10 tâches, aucune sur les notifications), et son seul
déclencheur est un envoi d'email à l'insertion. L'hypothèse la plus probable est l'application
elle-même, qui tourne en production pendant l'opération — **non vérifiée**. Elle n'était pas dans
l'archive puisqu'elle ne concernait pas les comptes de démo : elle est donc perdue. Une notification
de ton propre fil, sans conséquence fonctionnelle, mais écrite ici plutôt que passée sous silence.

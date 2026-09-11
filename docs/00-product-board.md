# Product Board — MonprojetPro (Hub · Lab · One)

> Source de verite produit, tenue par OTTO. Reconstitue le 2026-08-24 depuis CLAUDE.md, docs/ et 756 commits git.
> **Regle d'or : un identifiant est immortel. On change son statut, jamais son existence.**

| | |
|---|---|
| Projet | MonprojetPro (ex-Foxeo/Foxio) — Hub (operateur MiKL) + Lab (parcours accompagne) + One (dashboard client livre) |
| Proprietaire | MonProjetPro — produit interne, pas un projet client |
| Phase | Build (en production sur monprojet-pro.com, developpement continu) |
| Derniere mise a jour | 2026-08-31 par OTTO |
| Prochain jalon | [a confirmer par MiKL] |

---

## 1. Vision en 5 lignes

MonprojetPro est une plateforme modulaire de dashboards professionnels (monorepo Turborepo) qui outille
la relation MiKL <-> ses clients : **Hub** (pilotage operateur), **Lab** (parcours d'accompagnement
guide par les agents Elio), **One** (dashboard livre au client, abonnement recurrent). Vision v2
(2026-06-24) : le One est « la console de pilotage des livrables du client + le canal de lien
permanent avec MiKL » — un socle **Relation** universel surmonte de **Cockpits** sur-mesure par
projet. Reussi si le client reste dans son One (fidelisation) et si chaque module nourrit une
bibliotheque reutilisable (doctrine FORGE) plutot que d'etre recode. [a confirmer par MiKL]

---

## 2. INBOX — idees brutes non triees

| ID | Idee | Origine | Date | A qualifier avec |
|---|---|---|---|---|
| | | | | |

> Rien en attente de tri.

---

## 3. Backlog qualifie

| ID | Titre | Type | Origine | Priorite | Perimetre | Valeur | Effort | Statut | Epic | Cree | Cible | MAJ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F-001 | Gate FORGE (7 portes) sur les 9 modules Relation du socle One | Feature | Vision v2/FORGE | Should | Interne | H | L | Qualifie | — | 2026-06-24 | — | 2026-08-24 |
| F-002 | Premier Cockpit produit reel (Site / App) | Feature | Vision v2 | Should | A qualifier | H | L | Qualifie | — | 2026-06-24 | — | 2026-08-24 |
| F-003 | Webhooks & API publique One (placeholders "Phase 2") | Feature | Audit 07-03 | Could | A qualifier | M | L | Qualifie | — | 2026-07-03 | — | 2026-08-24 |
| F-004 | Support multi-operateur (app centree MiKL seul) | Exploration | Audit 07-03 | Could | Interne | M | L | Qualifie | — | 2026-07-03 | — | 2026-08-24 |
| F-005 | Posture Elio One (usage vs collecteur d'evolutions) | Amelioration | Vision v2 §9 | Should | Interne | M | M | Qualifie | — | 2026-06-24 | — | 2026-08-24 |
| F-006 | Sources de metriques cockpits — a decider par projet | Exploration | Vision v2 §9 | Could | Interne | M | L | Qualifie | — | 2026-06-24 | — | 2026-08-24 |
| T-001 | `elio-chat` ouverte au public (pas d'auth, CORS `*`) | Dette technique | Audit secu 07-03 | Must | Interne | H | M | Qualifie | — | 2026-07-03 | — | 2026-08-24 |
| T-002 | Policy `notifications_insert_system` trop ouverte | Dette technique | Audit secu 07-03 | Must | Interne | H | L | Qualifie | — | 2026-07-03 | — | 2026-08-24 |
| T-003 | Webhooks cal-com/contact-form fail-open si secret absent | Dette technique | Audit secu 07-03 | Should | Interne | M | L | Qualifie | — | 2026-07-03 | — | 2026-08-24 |
| T-004 | 32 fonctions SECURITY DEFINER exec. par anon + grant PUBLIC | Dette technique | Audit secu 07-03 | Should | Interne | M | M | Qualifie | — | 2026-07-03 | — | 2026-08-24 |
| T-005 | Buckets `client-assets`/`screenshots` publics et listables | Dette technique | Audit secu 07-03 | Should | Interne | M | M | Qualifie | — | 2026-07-03 | — | 2026-08-24 |
| T-006 | Aucun header securite (CSP/HSTS) + `ignoreBuildErrors:true` | Dette technique | Audit secu 07-03 | Should | Interne | M | L | Qualifie | — | 2026-07-03 | — | 2026-08-24 |
| T-007 | `npm audit` — dompurify/postcss/xmldom severite high | Dette technique | Audit secu 07-03 | Should | Interne | M | L | Qualifie | — | 2026-07-03 | — | 2026-08-24 |
| T-008 | 2 migrations en base sans fichier `.sql` dans le repo | Dette technique | Audit secu 07-03 | Must | Interne | H | L | Qualifie | — | 2026-07-03 | — | 2026-08-24 |
| T-009 | OAuth Gmail — `state` non signe (CSRF) | Dette technique | Audit secu 07-03 | Should | Interne | M | M | Qualifie | — | 2026-07-03 | — | 2026-08-24 |
| T-010 | Edge Function `env-probe-temp` active en prod, sans source | Dette technique | Audit secu 07-03 | Must | Interne | M | L | Qualifie | — | 2026-07-03 | — | 2026-08-24 |
| T-011 | Chaine de controles CI (doc, tests, isolation multi-tenant) | Dette technique | Dossier CII 08-22 | Must | Interne | H | M | Livre (isolation -> T-015) | — | 2026-08-22 | — | 2026-08-24 |
| T-012 | Migration 00094 fantome — remettre la base en coherence avec ses migrations | Dette technique | CI T-011 | Should | Interne | M | S | En attente MiKL | — | 2026-08-24 | — | 2026-08-24 |
| T-013 | 40 tests desynchronises du code | Dette technique | CI T-011 | Should | Interne | M | M | Livre | — | 2026-08-24 | — | 2026-08-24 |
| T-014 | Aucune config ESLint (15 packages la declarent) | Dette technique | CI T-011 | Should | Interne | M | M | Livre | — | 2026-08-24 | — | 2026-08-24 |
| T-015 | Droits anon/authenticated absents sur base reconstruite | Dette technique | CI T-011 | Must | Interne | H | M | Qualifie | — | 2026-08-24 | — | 2026-08-24 |
| F-010 | Synchronisation Gmail des relances du comptable (Story 13-9, jamais mise en service) | Feature | CI T-011 | Could | A qualifier | M | M | Bloque — entrees MiKL | — | 2026-08-24 | — | 2026-08-24 |
| T-018 | SPF de monprojet-pro.com obsolete (OVH) — n'autorise pas Resend, ne correspond plus au MX reel (Google). Fait DNS reel, mais fausse piste sur l'incident du 09-01 (cause reelle : Outlook local MiKL) | Dette technique | MiKL 2026-09-01 (signalement sans email recu) | Should | Interne | M | S | Qualifie — DNS chez MiKL, sans urgence | — | 2026-09-01 | — | 2026-09-01 |
| T-016 | Upload de capture d'ecran bloque en silence dans "Signaler un probleme" (Lab) | Bug | MiKL 2026-08-31 | Must | A qualifier | H | S | Livre | — | 2026-08-31 | 2026-08-31 | 2026-08-31 |
| F-011 | Rendre "Signaler un probleme" visible dans le Lab (bouton + onglet Mes signalements, icone alerte header) + suppression page orpheline /support | Feature | MiKL 2026-08-31 | Should | A qualifier | M | S | Livre | — | 2026-08-31 | 2026-08-31 | 2026-08-31 |
| F-013 | Kit FORGE « fil de discussion complet » : fil a 2 sens, pieces jointes visibles dans le fil, reecriture ET correction orthographe/syntaxe par l'IA (meme fonction qu'aujourd'hui, prompt fourni par le projet), temps reel par defaut avec repli signale a l'utilisateur quand la source ne le permet pas. S'appuie sur les kits deja extraits `pieces-jointes-supabase` et `realtime-refresh-supabase-next` plutot que de recopier | Feature | MiKL 2026-09-08 | Should | Interne | H | L | Livre | — | 2026-09-08 | 2026-09-08 | 2026-09-08 |
| T-022 | Un nouveau message MenuFacile n'est visible NULLE PART hors du module : pas de badge sur l'entree « MenuFacile » de la sidebar (alors que Chat et Comptabilite en ont un), et absent de « Messages non lus » de l'accueil — qui ne lit que la table `messages` du chat MPP, pas le guichet MenuFacile. Consumers oublies lors de l'ajout du module | Bug | MiKL 2026-09-09 (2 captures) | Should | Interne | M | M | Livre — badge sidebar (T-022) + accueil deja couvert par la tuile « Mes projets » de F-012 (verifie sur capture MiKL 11-09) | — | 2026-09-09 | — | 2026-09-11 |
| T-020a | Reste-a-faire de T-020, dette sans impact utilisateur : (1) `apps/hub/app/(auth)/login/page.tsx` — 2e page de login, filet de securite documente si `SUPABASE_SERVICE_ROLE_KEY` manque cote client, mais visuellement datee (pas de branding, pas de « mot de passe oublie ») : la neutraliser en simple relais vers l'entree unique, ou l'assumer ? (2) `apps/client/app/api/auth/callback/route.ts` — route dupliquee, commentee comme inatteignable dans son propre code : a supprimer | Dette technique | Audit T-020 2026-09-09 | Could | Interne | L | S | Qualifie |  — | 2026-09-09 | — | 2026-09-09 |
| T-022a | Reste-a-faire de T-022 : rendre les messages MenuFacile visibles sur l'ACCUEIL. SANS OBJET — deja livre le 08-09 par F-012. Capture MiKL du 11-09 : le coin « Mes projets » de l'accueil porte la tuile MenuFacile avec « Messages non traites : 2 ». La question posee (compteur unique OU deux lignes) etait donc deja tranchee dans les faits : DEUX lignes, dans deux panneaux distincts. Erreur d'analyse a la convergence de T-022 : j'ai cherche les messages MenuFacile dans le panneau « Messages non lus » sans verifier si un autre bloc de la MEME page les portait deja | Bug | Convergence T-022 2026-09-09 | Should | Interne | M | S | Sans objet — couvert par F-012 |  — | 2026-09-09 | — | 2026-09-11 |
| T-020 | Redirections vers l'authentification : tout ne pointe PAS vers la page de connexion unique. Constate par MiKL sur les boutons des emails (« Voir le message ») qui ramenent sur l'ancienne page de login. Audit complet a faire : emails, edge functions, middlewares, actions, liens en dur | Bug | MiKL 2026-09-09 (2 captures) | Must | Interne | H | M | Livre — reste T-020a | — | 2026-09-09 | — | 2026-09-09 |
| T-021 | Chat : l'abonnement temps reel ne lit pas son statut (se fige en silence si la table sort de la publication ou si la RLS bloque) ET l'envoi optimiste depend de ce meme abonnement pour se resoudre. Trouve par l'inventaire du kit F-013 | Dette technique | Inventaire F-013 2026-09-08, feu vert MiKL 2026-09-09 | Should | Interne | M | S | Livre | — | 2026-09-08 | — | 2026-09-09 |
| F-015 | Accueil Hub v3 — cockpit DEUX COLONNES : a gauche le travail (A traiter, puis Radar), a droite une colonne laterale fixe (chiffres en lignes + projets identifies par une pastille de couleur). Corrige les 5 griefs de la v2 : encarts trop gros, « a traiter » trop bas, clients/MRR pas prioritaires, Radar minuscule et en fin de page, projets mal identifies | Amelioration | MiKL 2026-09-08 (« l'ensemble ne me va pas, propose moi autre chose ») | Should | Interne | M | M | Livre | — | 2026-09-08 | 2026-09-08 | 2026-09-08 |
| F-014 | Refonte visuelle de l'accueil du Hub : 3 zones (Pilotage cyan, A traiter ambre, Radar gris), code couleur porteur de sens, grille KPI reparee, etats vides compactes, Radar repliable. Proposition PIXEL, lot complet arbitre par MiKL | Amelioration | MiKL 2026-09-08 (« ca commence a etre un peu le bazar ») | Should | Interne | M | M | Livre | — | 2026-09-08 | — | 2026-09-08 |
| F-012 | Coin "Mes projets" sur l'accueil du Hub : tuiles configurables par projet (MiKL coche ce qu'il veut voir). Premier occupant MenuFacile : messages non traites, foyers inscrits, foyers actifs 30j | Feature | MiKL 2026-09-08 | Should | Interne | M | M | Livre | — | 2026-09-08 | 2026-09-08 | 2026-09-08 |
| T-019 | Zone de saisie des reponses : le texte deborde de la pop-up et les boutons d'envoi deviennent inatteignables (toutes les `Textarea` du produit) | Bug | MiKL 2026-09-08 (capture, fil MenuFacile) | Must | Interne | H | S | Livre | — | 2026-09-08 | 2026-09-08 | 2026-09-08 |
| T-017 | Signalement Lab : jusqu'a 3 pieces jointes (au lieu d'1), compression image avant upload, upload direct navigateur->Supabase (pattern GuardVeto) | Amelioration | MiKL 2026-08-31 | Should | A qualifier | M | M | Livre | — | 2026-08-31 | 2026-08-31 | 2026-08-31 |
| T-023 | Pieces jointes MenuFacile invisibles dans le Hub : une cliente (Lucie, HIRVOAS LOTRIAN FAMILY) joint des captures d'ecran depuis l'app MenuFacile, le guichet les transporte, mais le fil du Hub n'affiche que `body` — les fichiers sont ignores en silence. Cause : le contrat consomme cote Hub (`ContactMessage`, `ContactThreadMessage`) n'a aucun champ fichier, et F-013 a explicitement decide de ne PAS appliquer le kit `fil-de-discussion-complet` aux implementations existantes. MiKL confirme : oubli cote Hub, pas cote MenuFacile. Perimetre elargi par MiKL le 10-09 : les DEUX sens (recevoir les fichiers de l'utilisateur ET pouvoir en envoyer depuis le Hub). Contrat d'API demande cote MenuFacile (instructions passees par MiKL a la session Claude Code du projet MenuFacile). MAJ 11-09 : MenuFacile renvoie la balle (« c'est de ton cote que ca se joue »). VERIFIE dans le code : `types/index.ts:256` `ContactThreadMessage = { sender, body, created_at }` — aucun champ fichier, et zero occurrence de attachment/file_url/piece jointe dans tout le module et sa doc. Donc si le guichet envoie deja les fichiers, le Hub les jette en silence et MenuFacile a raison. Reste a PROUVER par la reponse reelle du guichet — sonde ecrite (scratchpad `probe-guichet.mjs`), bloquee : `MENUFACILE_ADMIN_API_URL` absente du `.env.local` (seul le SECRET y est), et le pull des variables de production Vercel est refuse par le garde-fou secrets | Bug | MiKL 2026-09-10 (capture, message Lucie du 10/09 11:32) | Must | Interne | H | M | En cours — bloque sur l'URL du guichet (MiKL) | — | 2026-09-10 | — | 2026-09-11 |

> Perimetre `Interne` = dette invisible du client (jamais `Devis` par defaut, regle OTTO).
> Statuts "Qualifie" figes faute de suivi ecrit — a confirmer MiKL ce qui est deja traite depuis 07-03.

---

## 4bis. Convergence — controle de sortie avant commit

> **Rempli par OTTO avant CHAQUE commit qui contient du code.** Une ligne par element annonce.
> C'est la seule section que le harnais lit pour autoriser un commit : sans entree fraiche
> pour l'item concerne, `gate-commit` refuse. Ce n'est pas de la paperasse — c'est la reponse
> a la seule question qui compte : *a-t-on livre ce qui etait demande, en ENTIER ?*

| ID | Ce qui etait annonce | Ce qui est reellement livre | Verdict |
|---|---|---|---|
| T-020 | Cause racine identifiee, pas un fix a l'aveugle | `apps/hub/middleware.ts:42` construisait `new URL('/login', request.url)` — le `/login` LOCAL au Hub, l'ancienne page. Lu de mes yeux dans le fichier, pas seulement rapporte. Les 2 autres redirections du MEME fichier (coupure nocturne l.105, echec de handoff) utilisaient deja `getLoginEntryUrl()` : incoherence interne, pas une doctrine | OK |
| T-020 | Pourquoi les boutons d'email ramenaient sur l'ancienne page | Les emails a l'operateur pointent vers `hubBase + link` (ex. `/modules/chat/{id}`). Session expiree -> le middleware Hub intercepte a la ligne 42 -> ancienne page. Chaine verifiee de bout en bout : `send-email/handler.ts` (buildPlatformUrl) -> `chat/actions/send-message.ts:108` -> middleware | OK |
| T-020 | Tout doit mener a la page de connexion unique | Les 2 redirections fautives du middleware Hub passent a `getLoginEntryUrl()` : non authentifie (l.42) et compte non-operateur (l.78) | OK |
| T-020 | Ne pas perdre la destination au passage | La page visee traverse desormais les 4 maillons : middleware -> entree unique (`?redirectTo=`) -> formulaire (`formData`) -> `buildHubHandoffLink({ next })` -> route `/auth/handoff` qui la rejoue. Sans ca, corriger la redirection aurait fait atterrir MiKL sur l'accueil au lieu du message qu'il venait lire | OK |
| T-020 | Ne pas ouvrir de faille en transportant cette destination | GARDE-FOU `sanitizeReturnPath()` ajoute dans `packages/utils/src/app-urls.ts`, applique DEUX fois (a l'emission du lien et a l'arrivee). Refuse : URL absolue, `//host` protocol-relative, antislash normalise en slash, schema deguise (`javascript:`), chemin sans slash initial. Sans lui, un lien forge renverrait l'operateur vers un site exterieur APRES une connexion reussie | OK |
| T-020 | Le garde-fou est protege par des tests | 7 tests ajoutes a `packages/utils/src/app-urls.test.ts` -> 18 tests passes sur ce fichier | OK |
| T-020 | Le reste du produit pointe deja au bon endroit | Audit exhaustif : invitation Lab, email bienvenue One, mot de passe oublie, impersonation, bascule Hub, `site_url` Supabase — tous via les helpers centralises `getClientAppUrl()`/`getHubUrl()`/`getLoginEntryUrl()`. Aucun lien en dur, aucun localhost dans un chemin de production | OK |
| T-020 | Rien de casse | `turbo build` hub ET client -> 2 successful. `npx vitest run apps/hub packages/utils packages/supabase apps/client` -> 674 tests passes. NOTE HONNETE : le 1er passage affichait 2 echecs, le 2e 0, sans modification de code — je n'ai PAS reussi a les identifier, ils ne se reproduisent pas. Deja constate 2 fois aujourd'hui. Signale, non explique | OK |
| T-020 | Les 2 points cosmetiques de l'audit | PARTIEL — non faits : la 2e page de login du Hub (filet de securite documente) et une route de callback morte. Sans impact utilisateur. Reste-a-faire cree en T-020a avec la question a trancher | partiel |
| T-020 | Verification du parcours reel (clic sur un email, session expiree) | NON VERIFIE — demande une session reelle et un email recu ; a confirmer par MiKL | non verifie |
| T-021 | L'abonnement temps reel du chat doit LIRE son statut | `use-chat-realtime.ts` : `.subscribe((status, err) => ...)` traite SUBSCRIBED / CHANNEL_ERROR / TIMED_OUT / CLOSED, expose un etat `'connecting' | 'live' | 'degraded'` a l'appelant, et journalise les 3 causes a verifier dans l'ordre (publication, RLS, colonne du filtre) | OK |
| T-021 | Un abonnement tombe ne doit pas figer le chat en silence | Relecture de secours toutes les 20 s, active UNIQUEMENT quand l'etat est `degraded` (et seulement onglet visible). Volontairement pas de relecture permanente : elle masquerait la panne au lieu de la compenser | OK |
| T-021 | L'envoi de message ne doit plus dependre du temps reel pour se confirmer | `use-chat-messages.ts` : ajout du `onSettled` qui invalide `messages` et `conversations`. Le commentaire « onSettled non necessaire : Realtime fera l'invalidation » est remplace par l'explication du pari qu'il representait | OK |
| T-021 | Rien de casse dans le module chat | `npx vitest run packages/modules/chat` -> 18 fichiers, 109 tests passes | OK |
| T-022 | Badge sur l'entree « MenuFacile » de la sidebar | `hub-sidebar-client.tsx` : `useMenuFacileMetrics()` (hook existant, relecture 60 s car base separee sans Realtime), badge rendu comme ceux de Chat et Comptabilite, avec `aria-label` explicite | OK |
| T-022 | Ne jamais fabriquer un zero quand le guichet ne repond pas | `metrics?.contact?.new ?? 0` puis badge masque si 0 : guichet muet = pas de badge, jamais un « 0 » qui affirmerait qu'il n'y a rien a traiter. Verrouille par le test « ne fabrique pas de zero quand le guichet ne repond pas » | OK |
| T-022 | Le nouveau comportement est protege par des tests | 3 tests ajoutes (`badge MenuFacile (section Produits)`) -> `npx vitest run apps/hub/components/hub-sidebar-client.test.tsx` -> 18 tests passes | OK |
| T-022 | REGRESSION CAUSEE PAR MOI, corrigee | Mon ajout du hook a casse 15 tests de la sidebar (le fichier de test ne mockait pas `@monprojetpro/module-menu-facile`, donc le guichet externe etait appele en test). Mock ajoute, 18/18 verts. Signale plutot qu'absorbe | OK |
| T-022 | Messages MenuFacile visibles dans « Messages non lus » de l'accueil | PARTIEL — non fait. Deux systemes distincts (table `messages` vs guichet HTTP) : les fusionner est une decision produit, pas un correctif. Reste-a-faire cree en T-022a, question posee a MiKL. Aucune troisieme voie silencieuse | partiel |
| T-022 | Verification visuelle du badge | NON VERIFIE — demande une session Hub authentifiee ; a confirmer par MiKL | non verifie |
| F-015 | « A traiter » doit apparaitre plus tot dans le defilement | Structure inversee : la zone « A traiter » est le PREMIER bloc de la colonne principale, juste sous l'en-tete. Verifie dans le bundle : `lg:col-span-2` present dans `.next/server/app/(dashboard)/page.js` | OK |
| F-015 | « 2 gros encarts pour 2 elements, trop de place pour rien » | Les deux `HeroStat` (Total clients, MRR) sont supprimes. Les 6 chiffres passent en LIGNES dans un panneau lateral unique — mode `compact` ajoute a `MetricCard` et `InteractiveMetricCard`, qui gardent leur detail depliable intact | OK |
| F-015 | « clients et MRR, c'est pas le plus important » | Les chiffres quittent le flux principal pour la colonne laterale : contexte permanent, plus contenu principal | OK |
| F-015 | « le Radar aussi c'est important, et c'est tout petit a la fin » | Le Radar remonte en colonne principale, juste sous « A traiter », a taille pleine (2/3 de la largeur au lieu d'un bloc de fin de page) | OK |
| F-015 | « les projets, je vais en avoir plusieurs, mieux les identifier » | Chaque projet devient une carte a son nom : liseré lateral + pastille de couleur de son ton, en-tete propre, tuiles en lignes. Champ `tone` documente comme couleur d'identite (« eviter le cyan, reserve au Hub »). Nouveau `layout: 'row'` sur `ProjectTile` pour la colonne etroite | OK |
| F-015 | La colonne laterale reste visible pendant le defilement | `lg:sticky lg:top-6 lg:self-start` sur l'`<aside>` — verifie dans le bundle (`lg:sticky` present) | OK |
| F-015 | Rien de casse | `turbo build --filter=@monprojetpro/hub` -> 1 successful. `npx vitest run packages/ui/src apps/hub` -> 443 tests passes. NOTE HONNETE : un passage sur trois a affiche 1 echec, sans modification de code entre les passages, et JE N'AI PAS PU L'IDENTIFIER — il ne se reproduit pas. Symptome deja documente (cache Vitest), mais non prouve ici : je le signale plutot que de conclure a sa place | OK |
| F-015 | Verification visuelle de la v3 | VERIFIE PAR MiKL le 2026-09-09 sur la preview : « pour l'instant ca me va ». C'est la seule preuve que je ne pouvais pas produire moi-meme | OK |
| F-013 | IA : meme fonction qu'aujourd'hui — reecriture ET correction orthographe/syntaxe (arbitrage MiKL) | `actions/ai-rewrite.ts` : `correctDraft` (orthographe/grammaire/syntaxe, ton inchange, `temperature: 0.2`) et `rewriteDraft` (adaptation au destinataire, 0.7) ; le prompt metier est fourni par le projet, pas fige dans le kit | OK |
| F-013 | Temps reel par defaut, ET notifie quand ce n'est pas possible (arbitrage MiKL) | `ThreadSyncBadge` + `resolveSyncState` : 3 etats distincts affiches a l'ecran — « En direct » · « Actualise toutes les N s » (source sans temps reel) · « Mise a jour interrompue » (abonnement tombe). Le statut du canal est LU via `onStatut` du kit realtime, ce que le chat d'origine ne faisait pas du tout | OK |
| F-013 | Pieces jointes visibles dans le fil | `thread-message-bubble.tsx` : apercu pour les images, lien pour le reste, URL **signee a l'affichage** depuis un chemin stocke — corrige a la fois l'expiration a 7 jours du chat et l'URL publique permanente du kit pieces jointes | OK |
| F-013 | S'appuyer sur les kits deja extraits plutot que recopier (hypothese par defaut, non contredite) | Le kit importe `useRealtimeTables` (kit realtime) et documente `uploadAttachments`/`AttachmentsPicker` (kit pieces jointes) sans dupliquer une ligne de leur code ; dependance declaree en tete de README | OK |
| F-013 | Ne pas toucher aux implementations existantes du Hub (hypothese par defaut, non contredite) | Aucun fichier de `packages/modules/` modifie pour F-013 ; les defauts trouves sont consignes dans le CHANGELOG du kit et signales a MiKL, pas corriges d'office | OK |
| F-013 | Corriger l'angle mort partage par les 6 implementations | `lib/thread-draft.ts` : brouillon conserve (enregistrement differe 400 ms, efface APRES confirmation d'envoi seulement, expiration 7 jours, resiste a un stockage refuse ou corrompu) | OK |
| F-013 | Neutralite FORGE | `grep` sur `lib/ actions/ components/ db/` : aucune occurrence de MonprojetPro, Foxeo, GuardVeto, MenuFacile, MiKL, Elio, couleur de marque, `operator_id` ni `client_id` | OK |
| F-013 | Kit visible (sans quoi il n'existe pas) | Inscrit aux 3 endroits : tableau du README des kits, catalogue en etat vert, et bloc `capacites` lu par le hook OTTO (mots ajoutes : fil, repondre, brouillon, reecrire, corriger le texte, orthographe, accuse de lecture) | OK |
| F-013 | Le kit fonctionne | `npx vitest run` sur sa logique pure, executee hors du kit -> **17 tests passes**, relance confirmee ; dossier temporaire supprime (verifie absent) | OK |
| F-013 | Kit repose dans un vrai projet | NON VERIFIE — jamais encore copie ailleurs, donc presume reutilisable et non prouve. Ecrit en tete de son README | non verifie |
| F-014 | Grille KPI reparee : plus de debordement a droite (changement 1) | `page.tsx` : la grille `grid-cols-2 lg:grid-cols-6` est remplacee par 2 rangees — `HeroStat` x2 (Total clients, MRR) en `sm:grid-cols-2`, puis `grid-cols-2 lg:grid-cols-4` (Lab, One, Devis, Impayes). La brique `HeroStat` existait deja et n'etait pas utilisee sur cette page | OK |
| F-014 | Les 4 blocs « a traiter » regroupes sous un bandeau ambre avec compteur agrege (changement 2) | Nouvelle brique `CockpitZone` (`packages/ui/.../cockpit-zone.tsx`) enveloppant Validations + Escalades Elio + Messages non lus + Suggestions Elio ; compteur = somme des 4. Verifie dans le bundle de prod : `{title:"\xc0 traiter",count:Z,tone:"amber"}` dans `.next/server/app/(dashboard)/page.js` | OK |
| F-014 | Etats vides compactes sur une ligne (changement 3) | Nouvelle brique `EmptyRow` (une ligne, icone optionnelle) remplacant le `<p className="px-3 py-4 ...">` duplique a l'identique a 6 endroits de `page.tsx` | OK |
| F-014 | Prospects + parcours en pause fusionnes en un panneau Radar (changement 4) | Panneau unique « Mouvements clients » dans la zone Radar, badge = somme des deux ; les 2 anciens panneaux conditionnels supprimes (la page ne saute plus quand ils apparaissent). Verifie present dans le bundle | OK |
| F-014 | Zone Radar repliable, choix memorise (changement 5) | `CockpitZone` avec `collapsible` + `storageKey="hub-home-radar"` ; cle `cockpit-zone:hub-home-radar` en `localStorage`, lue dans un `useEffect` (jamais pendant le rendu — sinon erreur d'hydratation), `try/catch` si le stockage est refuse. Cle verifiee presente dans le bundle | OK |
| F-014 | Bandeau vert « Rien a traiter » les jours calmes (changement 6) | `CockpitCallout tone="emerald"` affiche quand `aTraiterTotal === 0` ; la zone ambre et ses 4 panneaux ne sont alors pas rendus du tout. Verifie dans le bundle : `title:"\xc0 traiter",children:"Rien \xe0 traiter — aucune valida...` | OK |
| F-014 | La couleur ne porte jamais seule le sens (contrainte accessibilite) | Chaque zone porte son intitule en toutes lettres (« A traiter », « Radar »), chaque item garde son icone (`bell`, `warning`), le bouton de repli expose `aria-expanded` et un libelle lisible par lecteur d'ecran | OK |
| F-014 | Rien de casse | `turbo build --filter=@monprojetpro/hub` -> 1 successful ; `npx vitest run packages/ui/src apps/hub` -> 443 tests passes (33 fichiers). NOTE HONNETE : le 1er passage affichait 1 echec, le 2e 0 echec sans aucune modification de code entre les deux — symptome de cache Vitest deja documente dans les lecons, pas une regression | OK |
| F-014 | Verification visuelle du nouvel accueil | NON VERIFIE — demande une session Hub authentifiee ; a confirmer par MiKL sur la preview | non verifie |
| F-012 | Le choix des tuiles est reglable dans l'interface, prefs stockees en base (zone d'ombre 1, validee par MiKL) | Table `hub_project_widget_prefs` appliquee en base reelle (`apply_migration` -> success ; `pg_class` verifie : RLS active, 1 policy, GRANT authenticated OK) + pop-up `ProjectCornerSettings` (cases a cocher) + `saveProjectWidgetPrefs` | OK |
| F-012 | Foyers : total ET actifs 30 jours sur la meme carte (zone d'ombre 2) | `get-home-widgets.ts` : `/metrics` -> `households.total`, et `/households?activity=30d&limit=1` -> `total` de l'enveloppe paginee (endpoint deja utilise par l'onglet Foyers) | OK |
| F-012 | Messages : compteur cliquable vers l'onglet Messages, sans liste (zone d'ombre 3) | Tuile « Messages non traites » = `metrics.contact.new`, `href: /modules/menu-facile`, mise en avant quand > 0 | OK |
| F-012 | Grille generique multi-projets des le depart, aucun nom de client en dur (zone d'ombre 4, doctrine FORGE) | `ProjectTile` (brique `packages/ui/.../cockpit`, ne connait aucun projet) + registre `apps/hub/lib/project-widgets.ts` (ajouter un projet = une entree, zero migration) ; la table ne stocke qu'une `widget_key` libre | OK |
| F-012 | Ne jamais fabriquer un chiffre quand la source ne repond pas | `null` = « non disponible » propage jusqu'a l'affichage (« — » + mention), erreur guichet affichee en « Mesure indisponible » ; aucun `?? 0` sur les compteurs | OK |
| F-012 | Un guichet lent ne doit pas retarder l'accueil | `<Suspense fallback={<ProjectCornerSkeleton />}>` autour du bloc dans `app/(dashboard)/page.tsx` | OK |
| F-012 | Etat vide traite (rien de coche) | Encart pointille « Aucune tuile affichee » + invitation a ouvrir « Choisir mes tuiles » ; une carte projet sans tuile cochee disparait au lieu de laisser un cadre vide | OK |
| F-012 | Une tuile decochee reste decochee | L'etat COMPLET part a l'enregistrement (cochees + decochees) ; `isWidgetEnabled` utilise `??` et non `||` — couvert par le test « ne confond pas decoche et absent » | OK |
| F-012 | Rien de casse, et le code part reellement en prod | `npx vitest run apps/hub/lib/project-widgets.test.ts` -> 5 tests passes ; `npx vitest run packages/modules/menu-facile packages/ui/src` -> 342 tests passes ; `turbo build` hub ET client -> 1 successful chacun ; « Mes projets » present dans `.next/server/app/(dashboard)/page.js` | OK |
| F-012 | Verification visuelle sur l'accueil reel + valeurs renvoyees par le guichet | NON VERIFIE — demande une session Hub authentifiee ; a confirmer par MiKL sur la preview | non verifie |
| T-019 | Cause racine du debordement identifiee, pas un fix a l'aveugle | `packages/ui/src/textarea.tsx` portait `field-sizing-content` (la zone grandit avec le texte) SANS aucun plafond de hauteur : une reponse longue pousse la zone et les boutons hors de la pop-up | OK |
| T-019 | La zone de saisie cesse de grandir et devient defilable | `max-h-[40vh]` + `overflow-y-auto` ajoutes au composant `Textarea` partage ; classes reellement generees dans le CSS de prod (`grep` dans `apps/hub/.next/static/css/6f0a9aed19848155.css` -> `.max-h-[40vh]{max-height:40vh}`) | OK |
| T-019 | Le fil de discussion reste lisible quand la reponse est longue | `messages-tab.tsx` : `max-h-[25vh]` sur la zone de reponse du `ThreadDialog` (zone en `shrink-0`, elle aurait sinon ecrase les bulles) ; classe generee (`.max-h-[25vh]{max-height:25vh}`) | OK |
| T-019 | Correction valable pour toutes les pop-ups de reponse, pas seulement MenuFacile | Fix pose dans le composant partage : 28 fichiers utilisent `<Textarea>` (validation-hub approve/reject/clarification/postpone, support, chat, crm, parcours, elio, email, moderation MenuFacile) — tous couverts ; un appelant peut toujours imposer son propre `max-h-*` (tailwind-merge) | OK |
| T-019 | Rien de casse | `npx turbo build --filter=@monprojetpro/hub` -> 1 successful, 1 total (3m15) | OK |
| T-019 | Verification visuelle sur la pop-up reelle | NON VERIFIE — demande une session Hub authentifiee ; a confirmer par MiKL sur la preview | non verifie |
| T-016 | Bucket/policies Supabase `screenshots` fonctionnels | Verifie en base reelle (`execute_sql`) : bucket public 5 Mo, policies insert/delete owner actives — non fautifs | OK |
| T-016 | Cause racine du blocage identifiee et corrigee | `apps/client/next.config.ts` : aucune limite `serverActions.bodySizeLimit` declaree -> defaut Next.js 1 Mo, trop bas pour une capture (5 Mo autorises cote action) ; ajout de `bodySizeLimit: '6mb'` | OK |
| T-016 | Le bouton reste bloque sans erreur si l'upload echoue | `screenshot-upload.tsx` : l'appel serveur n'etait pas dans un try/catch -> ajout try/catch/finally, erreur affichee, `uploading` toujours remis a `false` | OK |
| T-017 | Jusqu'a 3 pieces jointes (au lieu d'1) | `support_tickets.screenshot_urls TEXT[]` (migration 00136, verifie en base reelle via `execute_sql`), `MAX_ATTACHMENTS = 3` dans `attachment-constraints.ts`, `AttachmentsPicker` bloque au-dela | OK |
| T-017 | Compression des images avant upload, sans perte visible | `compress-image.ts` : redimensionnement 1920px max + reencodage WebP qualite 0.82 via canvas ; ne s'applique qu'aux images (PDF/GIF/HEIC passent tels quels) ; retombe sur l'original si echec ou si la compression n'allege pas | OK |
| T-017 | Upload direct navigateur -> Supabase (pattern GuardVeto), sans passer par le serveur Next.js | `upload-attachments.ts` utilise `createClient()` (client navigateur) au lieu d'une Server Action ; bucket relve a 10 Mo + formats elargis (migration 00137, verifie en base reelle) | OK |
| T-017 | Nettoyage des fichiers deposes si la creation du ticket echoue | `cleanupUploadedAttachments()` appele dans le `catch` de `ReportIssueDialog.onSubmit` | OK |
| T-017 | Tous les consommateurs mis a jour (Hub CRM, liste client, tests) | `client-support-tab.tsx` (liens multiples), `my-tickets-list.tsx` (compteur), 4 fichiers de test adaptes a `screenshot_urls[]` — verifie par `npx vitest run packages/modules/support/` -> 8 fichiers, 59 tests passes | OK |
| T-017 | Build ne casse pas (client + hub, consommateurs du type SupportTicket) | `npx turbo build --filter=@monprojetpro/client` et `--filter=@monprojetpro/hub` -> 1 successful chacun | OK |
| F-011 | Bouton "+" dans l'onglet "Mes signalements" | `apps/client/app/(dashboard)/modules/support/page.tsx` (route reellement liee par la sidebar, pas la page orpheline) | OK |
| F-011 | Icone triangle d'alerte dans le header, a cote de la cloche, Lab ET One, legerement rouge | `ReportIssueHeaderButton` branche dans `layout.tsx` sans condition de mode (corrige le 2026-08-31 : livre Lab-only par erreur, MiKL a demande la parite avec One), `text-red-400/70` au repos | OK |
| F-011 | Suppression de la page orpheline /support (doublon jamais lie a la sidebar) | Fichier supprime, confirme absent de la sortie `turbo build` (route `/support` n'apparait plus) | OK |

**Regles :**

- **Une ligne par case cochee** au tableau KIT COMPLET, ou par element de l'item du board.
- **Verdict** : `OK` · `partiel` · `absent`.
- **Verifier par la preuve, jamais de memoire** — un grep, un fichier ouvert, un test passe.
  Ecrire « livre » parce qu'on se souvient l'avoir code est exactement l'erreur que ce
  controle existe pour attraper.
- **Partiel ou absent -> ca ne commite pas.** Deux issues, jamais trois : finir maintenant, ou
  creer le reste-a-faire au board (`B-012` -> `B-012a`, avec son perimetre) et le dire a MiKL.
- **Le reste-a-faire porte le numero d'origine** : la filiation doit rester lisible six mois plus tard.
- Ne pas refaire une ligne a l'identique d'un commit a l'autre : le harnais le detecte et refuse.

> Cette section s'archive avec le « Livre » — c'est du passe verifie, reconstituable.

---

## 4. Livre

| ID | Titre | Version | Date reelle | Perimetre | Notes client |
|---|---|---|---|---|---|
| E-01 | Fondations monorepo — auth, RLS multi-tenant, sessions, design system | Epics 1-2 | 2026-02-10 -> 2026-02-17 | Interne | Setup Turborepo, auth client + MiKL (2FA), isolation RLS |
| E-04 | Validation Hub — file de demandes, decisions, workflows post-decision | Epic 7 | 2026-02-26 | A qualifier | Coeur du pilotage MiKL des soumissions Lab/One |
| E-05 | Elio — assistant IA multi-agents (Lab, Hub, One, One+) | Epics 6, 8, 14 | 2026-02-27 -> 2026-08-19 | A qualifier | Chantier le plus etendu de tout le projet |
| E-06 | Cycle de vie client — graduation Lab->One, suspension, cloture, RGPD | Epic 9 | 2026-03-04 -> 2026-03-05 | A qualifier | Migration Lab vers One, export RGPD, anonymisation |
| E-08 | Facturation — integration Pennylane (devis, abonnements, sync) | Epic 11 | 2026-03-07 -> 2026-04-15 | A qualifier | Polling Pennylane -> `billing_sync` -> Realtime |
| — | Rebrand Foxeo/Foxio -> MonprojetPro (domaine monprojet-pro.com) | — | 2026-04-14 | Interne | URLs, docs, marque |
| — | Refonte Vision v2 du One — socle Relation/Cockpits, agent FORGE, offres ①②③ | — | 2026-06-24, prix ajuste 2026-07-31 | Interne | Redefinit toute la strategie produit |
| — | Entree de connexion unique + bascule de domaine prod + sessions Hub bornees | — | 2026-08-04 | Interne | Durcissement securite + UX |
| — | Elio One devient l'intermediaire de MiKL (relais chat + prise de nouvelles) | — | 2026-08-19 | A qualifier | Dernier grand chantier avant ce board |
| — | Ruflo raccorde au MCP (scope User) — pipeline qualite code operationnel | — | 2026-08-19 | Interne | 3 mois sans controle qualite avant ce raccordement |

> 5 items supp. (E-02, E-03, E-07, E-09, E-10) archives dans `00-product-board-archive.md` (§4). Aucun ID perdu.

---

## 5. Ecarte et gele — registre des decisions

| ID | Titre | Decision | Raison | Decide par | Date | Reouvrable ? |
|---|---|---|---|---|---|---|
| F-007 | Kit de sortie One — instance dediee (Vercel + Supabase + repo transferes au client) | Ecarte | Utopie technique — tables `client_instances`/`instance_transfers` a 0 ligne, jamais declenche | MiKL | 2026-06-24 | Non |
| F-009 | Elio One+ agentique (generation de documents, actions modules) pour l'offre premium | Ecarte / corrige | Contradiction avec le positionnement One+ = coaching humain ; restait actif en base pour 2 clients reels | MiKL | 2026-08-19 | Oui — au devis, jamais inclus dans un tier |
| — | Prix de l'offre One | Change | 39€/mois -> 49€/mois | MiKL | 2026-07-31 | — |

> 3 items supp. (F-008, offre ① standalone, kit de sortie LAB garde) archives dans `00-product-board-archive.md` (§5).

---

## 6. Hors devis a chiffrer

| ID | Titre | Demande par | Origine (appel / mail / reunion) | Date demande | Estimation | Statut chiffrage |
|---|---|---|---|---|---|---|
| | | | | | | |

> Aucune trace de demande hors devis — produit interne MPP, pas un chantier facture. A confirmer MiKL.

---

## 7. En attente d'action externe

| Quoi | Qui doit agir | Bloque quel item | Depuis |
|---|---|---|---|
| Fournir l'adresse e-mail de reference du comptable **et** un exemple d'e-mail Pennylane (pour calibrer la reconnaissance) | MiKL | F-010 | 2026-08-24 |
| Autoriser le rejeu de la migration 00094 en production (mise en coherence, sans effet visible) | MiKL | T-012 | 2026-08-24 |
| Ajouter le secret `PENNYLANE_API_TOKEN` dans Supabase Edge Functions (distinct du secret Vercel) | MiKL | Bouton « Sync Comptabilite » | 2026-07-03 |
| Verifier `CALCOM_WEBHOOK_SECRET` / `CONTACT_FORM_WEBHOOK_SECRET` bien definis dans Vercel | MiKL | T-003 | 2026-07-03 |
| Supprimer l'Edge Function `env-probe-temp` (sonde debug sans source, active en prod) | MiKL | T-010 | 2026-07-03 |
| Fournir `VERCEL_TOKEN` / `SUPABASE_MANAGEMENT_TOKEN` pour un kit de sortie complet (non urgent) | MiKL | F-007 si rouvert | 2026-07-03 |
| Confirmer DNS/SSL `hub.`/`app.`/vitrine — **suspect deja fait**, commits d'aout montrent la bascule | MiKL | Mise en prod | 2026-04-15 |
| Compte Pennylane prod actif, backups Supabase actives | MiKL | Onboarding client | 2026-04-15 |
| Fournir `MENUFACILE_ADMIN_API_URL` (URL de base du guichet, pas un secret) : soit ici en clair, soit ajoutee au `.env.local`, soit relevee dans Vercel > monprojetpro-hub > Environment Variables. Sans elle, impossible de sonder ce que le guichet renvoie reellement sur un fil avec pieces jointes — c'est le seul point de blocage de T-023 | MiKL | T-023 | 2026-09-11 |
| Implementer les endpoints « pieces jointes » du guichet MenuFacile (lecture des fichiers joints par l'utilisateur, envoi de fichiers par l'operateur, affichage cote app). Instructions passees par MiKL a la session Claude Code du projet MenuFacile le 10-09. Le Hub ne peut rien coder avant | Projet MenuFacile (MiKL) | T-023 | 2026-09-10 |
| Trancher (FORGE) : rien a extraire du correctif chat/temps reel — le pattern EST DEJA au catalogue (`realtime-refresh-supabase-next` pour la detection d'abonnement mort, `fil-de-discussion-complet` pour le badge de fraicheur). Ce qui vient d'etre ecrit est l'application locale de ces deux kits, pas une brique nouvelle. Avis : ne rien faire. A confirmer par MiKL pour clore | MiKL | T-021 | 2026-09-09 |

> Suspects "traite mais jamais coche" (a trancher MiKL, non retires) : DNS ci-dessus ; T-010 ; T-003.

---

## 8. Journal des decisions et changements de perimetre

| Date | Evenement | Items concernes | Decide par |
|---|---|---|---|
| 2026-09-11 | T-022a ferme SANS OBJET sur capture de MiKL : le coin « Mes projets » de l'accueil (livre le 08-09 avec F-012) affiche deja la tuile MenuFacile avec « Messages non traites : 2 ». La question « compteur unique ou deux lignes » etait donc deja tranchee dans les faits — deux lignes, dans deux panneaux distincts de la meme page. Lecon : a la convergence de T-022, j'ai cherche la donnee dans LE panneau que je soupconnais (« Messages non lus ») au lieu d'inventorier tous les blocs de la page d'accueil. Un consumer peut etre deja couvert par un autre bloc du meme ecran — verifier l'ECRAN, pas seulement le composant suspect | T-022, T-022a, F-012 | MiKL |
| 2026-09-09 | MiKL dit OUI au renforcement du kit `auth-supabase-next`. FAIT : le filtre de destination de retour (`safeNext`) vivait en 2 copies, dans une version qui laissait passer `/\site-externe` (antislash normalise en slash par les navigateurs, ce qui reconstitue une URL protocol-relative APRES le filtre) et `/javascript:...`. Une seule definition desormais (`lib/safe-next.ts`), plus stricte, avec fallback explicite par appelant, 10 tests executes hors du kit, CHANGELOG cree (le kit n'en avait pas) et 2 points ajoutes a sa CHECKLIST dont un test de destination forgee. Trouvaille declenchee par la question FORGE elle-meme : c'est en allant verifier si le kit couvrait le sujet qu'on a vu qu'il le couvrait MAL. Question CLOSE | T-020 | MiKL |
| 2026-09-09 | MiKL tranche NON sur la capitalisation du principe de mise en page d'un tableau de bord (hierarchie par nature d'attention + cockpit 2 colonnes) dans `ui-patterns-kits.md` : « on s'en fout, pour l'instant ca me va ». Question CLOSE — ne plus la reposer sur l'accueil du Hub. A rouvrir seulement si un futur projet redemande un tableau de bord et que le raisonnement doit etre refait de zero. Au meme moment, MiKL valide la v3 de l'accueil (« ca me va ») : c'est la verification visuelle qui manquait a la convergence de F-015 | F-014, F-015 | MiKL |
| 2026-09-08 | 3e re-declenche FORGE « chat / messagerie » — cette fois sur un tour qui N'A ECRIT AUCUN FICHIER (une simple reponse de texte a une notification d'agent). La question est deja tranchee et journalisee 2 lignes plus bas, kit extrait et catalogue. Constat a remonter, pas a absorber : la gate se rearme sur du code ecrit PLUS TOT dans la session, sans se souvenir qu'elle a deja pose la question pour ce meme code. Meme symptome que les 3 re-declenches sur F-011 le 2026-08-31. Piste si ca devient genant : marquer la question comme traitee pour un empreinte de code donnee, au lieu de la reposer a chaque fin de tour | F-013 | MAX |
| 2026-09-08 | Question FORGE re-declenchee (capacite « chat / messagerie ») sur le code du kit `fil-de-discussion-complet`. Sans objet, meme raison que la ligne du dessous : ce code EST le produit de l'extraction demandee par MiKL. En revanche la re-declenche a servi a quelque chose — elle a impose la verification de completude contre `ui-patterns-kits.md` (entree « Chat / Messagerie »), qui n'avait pas ete faite. Resultat : Cmd/Ctrl+Entree etait absent du minimum vital, ajoute ; et 11 ecarts reels documentes dans le README du kit (avatar, « en train d'ecrire », edition/suppression, markdown et liens cliquables, copier, historique pagine, recherche, liste des conversations, badges ailleurs dans l'app, presence). Le kit est donc un FIL DE DISCUSSION, pas un chat complet — la nuance change le chiffrage d'un futur projet | F-013 | MAX |
| 2026-09-08 | Question FORGE re-declenchee (capacite « tableau de bord ») sur le code du kit lui-meme. Sans objet : ce code EST le produit de l'extraction tranchee le jour meme par MiKL — il est deja neutre, deja dans `installation WF base/kits/`, deja au catalogue. Extraire l'extraction n'a pas de sens. Ne pas reposer la question sur les fichiers de `kits/` : par construction, ils sont deja des kits | F-012 | MAX |
| 2026-09-08 | MiKL tranche la question FORGE : le coin « Mes projets » DOIT resservir. Extrait sous `installation WF base/kits/tuiles-dashboard-configurables/`. La recherche prealable dans les 7 autres projets MPP a trouve une 2e implementation du meme pattern, jamais reperee : `preferences_affichage` de GuardVeto (colonnes de compteurs choisies, `colonnesCompteurs.ts` + `CompteursPanel.tsx`). Le kit combine les deux et corrige l'angle mort de chacune — GuardVeto ne gerait pas une source de donnees injoignable, foxeo-one ne savait pas reordonner. Le reordonnancement etait pourtant liste comme « implication oubliee » du pattern Dashboard dans `ui-patterns-kits.md` : aucune des deux implementations ne l'avait. Kit inscrit au catalogue (etat vert), au bloc `capacites` du hook OTTO et au README des kits ; 20 tests sur la logique pure, executes hors du projet d'origine | F-012 | MiKL |
| 2026-09-01 | T-017 confirme en conditions reelles : MiKL a cree un signalement avec 1 piece jointe depuis la prod (c'est ce test qui a declenche l'investigation email ci-dessous) — upload direct + compression fonctionnent | T-017 | MiKL |
| 2026-09-01 | Suite : fausse piste. MiKL confirme avoir bien recu l'email — le probleme venait de son client Outlook (local, hors du systeme), pas de l'envoi. Le SPF obsolete reste un fait DNS reel et verifie, mais n'etait PAS la cause de cet incident precis : T-018 reste ouvert comme dette technique a corriger (bonne pratique deliverabilite), redescendu de "cause probable" a "a corriger un jour, sans urgence" | T-018 | MiKL |
| 2026-09-01 | MiKL signale ne rien recevoir en boite mail pour un signalement, alors que Resend confirme l'envoi. Verifie en base : notification + `activity_logs` (`email_sent`) bien crees pour `contact@monprojet-pro.com`, donc pas un bug applicatif. DNS reel (`nslookup`) montre un SPF obsolete (`v=spf1 include:mx.ovh.com -all`) qui n'autorise ni Resend ni le MX reel (`smtp.google.com`, Google Workspace) — reste d'une ancienne configuration mail jamais mise a jour. Cree T-018 ; correction DNS chez le registrar, hors de portee ici | T-018 | MAX |
| 2026-08-31 | Question FORGE re-declenchee une 3e fois (capacite "tableau de bord") sur le fix qui etend `ReportIssueHeaderButton` a One en plus du Lab. Meme reponse que les 2 fois precedentes : toujours le meme point d'integration a 1 ligne dans le header existant, aucun module nouveau. Ne pas redemander sur ce fichier tant que la nature du changement ne change pas (composant reutilisable, nouvelle logique) | F-011 | MAX |
| 2026-08-31 | Question FORGE re-declenchee (capacites "documents/upload" et "tableau de bord") sur le meme commit que T-017. Deja traite pour la partie upload : `pieces-jointes-supabase` extrait et catalogue (voir ligne du dessous). Pour la partie "tableau de bord" : le seul changement est `ReportIssueHeaderButton` branche dans `apps/client/layout.tsx` derriere `activeMode === 'lab'` — un point d'integration a 3 lignes dans le header existant, pas un module de tableau de bord en soi (rien a neutraliser, rien a cataloguer). Pas de nouvelle question a MiKL | F-011 | MAX |
| 2026-08-31 | MiKL confirme le fix T-016 en prod et va plus loin : jusqu'a 3 pieces jointes (au lieu d'1), compression des images, et va-t'y pour F-011. Le pattern demande explicitement ("celui qu'on a cree pour GuardVeto") existait deja dans GuardVeto (module support B-016, 2026-08-21) : upload direct navigateur -> Supabase Storage, contournant par construction toute limite de taille de requete serveur. Repris et complete pour foxeo-one avec l'ajout de la compression (absente cote GuardVeto). Extrait en meme temps dans la bibliotheque FORGE (`pieces-jointes-supabase`, MiKL a valide la reutilisation). F-011 livre dans la foulee : bouton "+" dans l'onglet Mes signalements, icone triangle Lab-only dans le header, page orpheline /support supprimee | T-017, F-011 | MAX |
| 2026-08-31 | Bug remonte par MiKL (capture d'ecran) : upload bloque en silence dans "Signaler un probleme". Cause racine trouvee par preuve (bucket/policies Supabase verifies sains en base reelle, puis code inspecte) : `next.config.ts` sans `serverActions.bodySizeLimit` -> defaut Next.js 1 Mo trop bas pour une capture (5 Mo autorises cote action) ; en plus, l'appel serveur n'etait pas dans un try/catch, donc l'echec restait invisible et le bouton bloque. Les deux corriges. A la meme occasion, visibilite insuffisante du signalement releve par MiKL -> F-011 cree, en attente de son feu vert avant dev | T-016, F-011 | MAX |
| 2026-08-25 | Analyse statique mise en place : ESLint n'etait installe nulle part alors que 15 paquets declaraient la commande. Une seule configuration a la racine, ce qui signale de vrais defauts sans imposer de style. 27 erreurs corrigees, 110 avertissements laisses visibles. Trouvaille au passage : `useSessionCookies` n'etait pas un hook React malgre son nom — renomme `shouldUseSessionCookies` | T-014 | MAX |
| 2026-08-24 | Impact de T-012 revu a la baisse apres verification : la fonction sync-accountant-emails n'est pas deployee, son declencheur n'est pas arme, son analyseur d'e-mails est un squelette et ses deux ecrans ne sont rendus nulle part. Rien n'etait donc casse en service — seule la reconstruction d'une base neuve etait bloquee. La fonctionnalite elle-meme devient F-010, en attente de deux elements que seul MiKL peut fournir | T-012, F-010 | MAX |
| 2026-08-24 | Chaine de controles verte sur GitHub Actions : documentation (17/17 modules) et suite de tests (650 fichiers, 5 469 cas) au vert a chaque envoi de code. Le volet isolation reste en declenchement manuel jusqu'a T-015. Aucun fichier de production modifie sur tout le chantier | T-011, T-013 | MAX |
| 2026-08-24 | T-013 repasse de Livre a En revue : la mesure annoncee comptait les cas de test, pas les fichiers impossibles a charger. Trois fichiers ne s'ouvraient pas — le paquet `server-only`, garde-fou de production, bloque en test tout composant dont la chaine d'imports le traverse. Neutralise par un module de remplacement reserve aux tests ; le garde-fou reste entier dans l'application | T-013 | MAX |
| 2026-08-24 | Suite de tests entierement verte : 5 455 cas, aucun echec (86 en echec au depart du chantier). Aucun fichier de production modifie — le produit etait correct, c'est la suite de tests qui avait pris du retard sur lui | T-013 | MAX |
| 2026-08-24 | Lot 2 traite : les tests decrivaient l'etat anterieur du produit. Deux d'entre eux validaient encore l'agentique One+ (F-009, ecartee le 19-08) et un troisieme une table supprimee par la migration 00108 — retournes pour proteger ces decisions au lieu d'etre supprimes. Le tri de la file de validation suivait la decision du 02-06 (1f64318) jamais repercutee | T-013, F-009 | MAX |
| 2026-08-24 | Verifie : `.mcp.json` gitignore + deja en variables d'env — alerte audit 07-03 sur le token Supabase levee | — | OTTO |
| 2026-08-24 | Chaine CI mise en place (dossier CII decrivait un dispositif pas encore existant) ; a fait remonter 3 problemes reels : droits anon/authenticated absents en base reconstruite (cause racine trouvee, fix = decision securite a valider CERBERE+MiKL), migration 00094 jamais executee (accountant_notifications absente prod, corrige, rejeu en attente MiKL), 40 tests desynchronises | T-011, T-012, T-015 | MAX |
| 2026-08-19 | Ruflo effectivement raccorde au MCP (scope User) apres 3 mois muet (2026-05-27 -> 2026-08-19) | — | MiKL |
| 2026-08-19 | Elio One+ agentique corrige/ecarte — restait actif en base pour 2 clients malgre la doctrine | F-009 | MiKL |
| 2026-08-04 | Bascule des adresses Vercel vers le domaine definitif + entree de connexion unique en prod | — | MiKL |
| 2026-07-31 | Prix de l'offre One releve de 39€ a 49€/mois | — | MiKL |
| 2026-07-03 | Audit securite Horizon 1 — correction du 🔴 critique ; reliquat 🟠 liste en T-001 a T-009 | T-001..T-009 | MiKL |
| 2026-06-24 | Vision v2 du One validee : abandon kit de sortie One, creation agent FORGE, offres ①②③ | F-007, F-008 | MiKL |
| 2026-05-27 | CLAUDE.md du projet aligne sur MPP v4.0 hybride (MPP + Ruflo) | — | MiKL |
| 2026-04-22 | Migration Visio : abandon OpenVidu au profit de Google Meet API | E-03 | MiKL |
| 2026-04-14 | Rebrand complet Foxeo/Foxio -> MonprojetPro, domaine monprojet-pro.com | — | MiKL |
| 2026-04-13 | Phase 2 rework — instance multi-tenant unique + toggle Lab/One (ADR-01 Rev.2) | E-10, F-007 | MiKL |
| 2026-02-10 | Demarrage — setup monorepo, 12 epics et 126 stories planifiees | E-01 | MiKL |

---

## Conventions

Voir le template MPP `installation WF base/templates-projet/docs/00-product-board.md`.

---

*OTTO. Board vivant — toute nouvelle idee entre par la section 2 (INBOX).*

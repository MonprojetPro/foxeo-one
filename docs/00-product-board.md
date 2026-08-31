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

> Rien en attente de tri — le flux d'idees recentes a ete qualifie directement en backlog.

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
| T-016 | Upload de capture d'ecran bloque en silence dans "Signaler un probleme" (Lab) | Bug | MiKL 2026-08-31 | Must | A qualifier | H | S | Livre | — | 2026-08-31 | 2026-08-31 | 2026-08-31 |
| F-011 | Rendre "Signaler un probleme" visible dans le Lab (bouton + onglet Mes signalements, icone alerte header) + suppression page orpheline /support | Feature | MiKL 2026-08-31 | Should | A qualifier | M | S | Qualifie — attente go MiKL | — | 2026-08-31 | — | 2026-08-31 |

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
| T-016 | Bucket/policies Supabase `screenshots` fonctionnels | Verifie en base reelle (`execute_sql`) : bucket public 5 Mo, policies insert/delete owner actives — non fautifs | OK |
| T-016 | Cause racine du blocage identifiee et corrigee | `apps/client/next.config.ts` : aucune limite `serverActions.bodySizeLimit` declaree -> defaut Next.js 1 Mo, trop bas pour une capture (5 Mo autorises cote action) ; ajout de `bodySizeLimit: '6mb'` | OK |
| T-016 | Le bouton reste bloque sans erreur si l'upload echoue | `screenshot-upload.tsx` : l'appel serveur n'etait pas dans un try/catch -> ajout try/catch/finally, erreur affichee, `uploading` toujours remis a `false` | OK |

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
| Confirmer sur la preview Vercel qu'une vraie capture d'ecran s'uploade desormais dans "Signaler un probleme" (non teste en conditions reelles depuis ce terminal) | MiKL | T-016 | 2026-08-31 |
| Dire si "vas-y" pour F-011 (visibilite du signalement), et si ScreenshotUpload merite d'etre neutralise/catalogue par FORGE pour reservir sur d'autres projets | MiKL | F-011 | 2026-08-31 |
| Compte Pennylane prod actif, Resend verifie (SPF/DKIM/DMARC), backups Supabase actives | MiKL | Onboarding client | 2026-04-15 |

> Suspects "traite mais jamais coche" (a trancher MiKL, non retires) : DNS ci-dessus ; T-010 ; T-003.

---

## 8. Journal des decisions et changements de perimetre

| Date | Evenement | Items concernes | Decide par |
|---|---|---|---|
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

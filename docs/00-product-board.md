# Product Board — MonprojetPro (Hub · Lab · One)

> Source de verite produit, tenue par OTTO. Reconstitue le 2026-08-24 depuis CLAUDE.md, docs/ et 756 commits git.
> **Regle d'or : un identifiant est immortel. On change son statut, jamais son existence.**

| | |
|---|---|
| Projet | MonprojetPro (ex-Foxeo/Foxio) — Hub (operateur MiKL) + Lab (parcours accompagne) + One (dashboard client livre) |
| Proprietaire | MonProjetPro — produit interne, pas un projet client |
| Phase | Build (en production sur monprojet-pro.com, developpement continu) |
| Derniere mise a jour | 2026-08-24 par OTTO |
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
| T-011 | Chaine de controles CI (doc, tests, isolation multi-tenant) | Dette technique | Dossier CII 08-22 | Must | Interne | H | M | En cours | — | 2026-08-22 | — | 2026-08-24 |
| T-012 | Migration 00094 fantome — `accountant_notifications` absente prod | Dette technique | CI T-011 | Must | Interne | H | S | En cours | — | 2026-08-24 | — | 2026-08-24 |
| T-013 | 40 tests desynchronises du code | Dette technique | CI T-011 | Should | Interne | M | M | En cours | — | 2026-08-24 | — | 2026-08-24 |
| T-014 | Aucune config ESLint (15 packages la declarent) | Dette technique | CI T-011 | Should | Interne | M | M | Qualifie | — | 2026-08-24 | — | 2026-08-24 |
| T-015 | Droits anon/authenticated absents sur base reconstruite | Dette technique | CI T-011 | Must | Interne | H | M | Qualifie | — | 2026-08-24 | — | 2026-08-24 |

> Perimetre `Interne` = dette invisible du client (jamais `Devis` par defaut, regle OTTO).
> Statuts "Qualifie" figes faute de suivi ecrit — a confirmer MiKL ce qui est deja traite depuis 07-03.

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
| Ajouter le secret `PENNYLANE_API_TOKEN` dans Supabase Edge Functions (distinct du secret Vercel) | MiKL | Bouton « Sync Comptabilite » | 2026-07-03 |
| Verifier `CALCOM_WEBHOOK_SECRET` / `CONTACT_FORM_WEBHOOK_SECRET` bien definis dans Vercel | MiKL | T-003 | 2026-07-03 |
| Supprimer l'Edge Function `env-probe-temp` (sonde debug sans source, active en prod) | MiKL | T-010 | 2026-07-03 |
| Fournir `VERCEL_TOKEN` / `SUPABASE_MANAGEMENT_TOKEN` pour un kit de sortie complet (non urgent) | MiKL | F-007 si rouvert | 2026-07-03 |
| Confirmer DNS/SSL `hub.`/`app.`/vitrine — **suspect deja fait**, commits d'aout montrent la bascule | MiKL | Mise en prod | 2026-04-15 |
| Compte Pennylane prod actif, Resend verifie (SPF/DKIM/DMARC), backups Supabase actives | MiKL | Onboarding client | 2026-04-15 |

> Suspects "traite mais jamais coche" (a trancher MiKL, non retires) : DNS ci-dessus ; T-010 ; T-003.

---

## 8. Journal des decisions et changements de perimetre

| Date | Evenement | Items concernes | Decide par |
|---|---|---|---|
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

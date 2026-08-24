# Product Board — MonprojetPro (Hub · Lab · One)

> Source de verite produit. Tenu par OTTO, consultable par MiKL et par toute l'equipe a tout moment.
> Reconstitue le 2026-08-24 depuis CLAUDE.md, docs/ et l'historique git complet (756 commits, 2026-02-10 -> 2026-08-24).
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
la relation MiKL <-> ses clients sur tout le cycle de vie : **Hub** (poste de pilotage operateur),
**Lab** (parcours d'accompagnement pas-a-pas guide par les agents Elio), **One** (dashboard livre au
client, abonnement recurrent). Vision v2 (2026-06-24) : le One est « la console de pilotage des
livrables du client + le canal de lien permanent avec MiKL » — un socle universel de modules
**Relation** (identique pour tous) surmonte de **Cockpits** sur-mesure par projet. Reussi si : le
client reste dans son One (fidelisation), et chaque module developpe nourrit une bibliotheque
reutilisable (doctrine FORGE) plutot que d'etre recode a chaque commande. [a confirmer par MiKL]

---

## 2. INBOX — idees brutes non triees

| ID | Idee | Origine | Date | A qualifier avec |
|---|---|---|---|---|
| | | | | |

> Rien en attente de tri a la reconstitution — le flux d'idees recentes a ete qualifie directement
> en items de backlog ci-dessous.

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
| T-011 | Chaine de controles CI (documentation, tests, isolation multi-tenant) | Dette technique | Dossier CII 08-22 | Must | Interne | H | M | En cours | — | 2026-08-22 | — | 2026-08-24 |
| T-012 | Migration 00094 fantome — `accountant_notifications` absente en prod | Dette technique | CI T-011 | Must | Interne | H | S | En cours | — | 2026-08-24 | — | 2026-08-24 |
| T-013 | 40 tests desynchronises du code (lot 2 du chantier T-011) | Dette technique | CI T-011 | Should | Interne | M | M | Qualifie | — | 2026-08-24 | — | 2026-08-24 |
| T-014 | Aucune configuration ESLint dans le depot (15 packages la declarent) | Dette technique | CI T-011 | Should | Interne | M | M | Qualifie | — | 2026-08-24 | — | 2026-08-24 |

> Perimetre `Interne` = dette invisible du client (jamais `Devis` par defaut, regle OTTO).
> Statuts figes "Qualifie" faute de suivi ecrit — a confirmer avec MiKL ce qui est deja traite depuis le 07-03.

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

> 5 items supp. (E-02, E-03, E-07, E-09, E-10) archives dans `docs/00-product-board-archive.md` (§4).
> Aucun ID perdu. Detail des stories : `docs/patch-log.md` + journal git.

---

## 5. Ecarte et gele — registre des decisions

| ID | Titre | Decision | Raison | Decide par | Date | Reouvrable ? |
|---|---|---|---|---|---|---|
| F-007 | Kit de sortie One — instance dediee (Vercel + Supabase + repo transferes au client) | Ecarte | Utopie technique — tables `client_instances`/`instance_transfers` a 0 ligne, jamais declenche | MiKL | 2026-06-24 | Non |
| F-009 | Elio One+ agentique (generation de documents, actions modules) pour l'offre premium | Ecarte / corrige | Contradiction avec le positionnement One+ = coaching humain ; restait actif en base pour 2 clients reels | MiKL | 2026-08-19 | Oui — au devis, jamais inclus dans un tier |
| — | Prix de l'offre One | Change | 39€/mois -> 49€/mois | MiKL | 2026-07-31 | — |

> 3 items supp. (F-008, offre ① standalone, kit de sortie LAB garde) archives dans
> `docs/00-product-board-archive.md` (§5).

---

## 6. Hors devis a chiffrer

| ID | Titre | Demande par | Origine (appel / mail / reunion) | Date demande | Estimation | Statut chiffrage |
|---|---|---|---|---|---|---|
| | | | | | | |

> Aucune trace ecrite de demande client chiffree hors devis — produit interne MPP, pas un chantier
> facture. A confirmer avec MiKL si des demandes commerciales existent ailleurs.

---

## 7. En attente d'action externe

| Quoi | Qui doit agir | Bloque quel item | Depuis |
|---|---|---|---|
| Revoquer/regenerer le token Supabase en clair dans `.mcp.json` (`sbp_…`), passer en variable d'env Windows | MiKL | Securite generale | 2026-07-03 |
| Ajouter le secret `PENNYLANE_API_TOKEN` dans Supabase Edge Functions (distinct du secret Vercel) | MiKL | Bouton « Sync Comptabilite » | 2026-07-03 |
| Verifier `CALCOM_WEBHOOK_SECRET` / `CONTACT_FORM_WEBHOOK_SECRET` bien definis dans Vercel | MiKL | T-003 | 2026-07-03 |
| Supprimer l'Edge Function `env-probe-temp` (sonde debug sans source, active en prod) | MiKL | T-010 | 2026-07-03 |
| Fournir `VERCEL_TOKEN` / `SUPABASE_MANAGEMENT_TOKEN` pour un kit de sortie complet (non urgent) | MiKL | F-007 si rouvert | 2026-07-03 |
| Confirmer DNS/SSL sur `hub.`, `app.`, vitrine `monprojet-pro.com` | MiKL | Mise en prod complete | 2026-04-15 |
| Compte Pennylane prod actif, Resend verifie (SPF/DKIM/DMARC), backups Supabase actives | MiKL | Onboarding client reel | 2026-04-15 |

---

## 8. Journal des decisions et changements de perimetre

| Date | Evenement | Items concernes | Decide par |
|---|---|---|---|
| 2026-08-24 | Premiere execution reelle des scenarios d'isolation : `permission denied` sur plusieurs tables, alors que la production porte bien ces droits. Sonde de diagnostic posee avant tout correctif | T-011 | MAX |
| 2026-08-24 | Migration 00094 inscrite comme appliquee mais jamais executee : `accountant_notifications` absente en prod, synchronisation Gmail comptable inoperante. Fichier corrige, rejeu en production en attente de MiKL | T-012 | MAX |
| 2026-08-24 | Mise en place de la chaine de controles CI, en appui du dossier CII : le dossier decrivait un dispositif qui n'existait pas encore | T-011 | MiKL |
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

Voir `00-product-board.md` du template MPP (`installation WF base/templates-projet/docs/00-product-board.md`).

---

*Reconstitue par OTTO le 2026-08-24 depuis CLAUDE.md, docs/ et 756 commits git. Board vivant des
maintenant — toute nouvelle idee entre par la section 2 (INBOX).*

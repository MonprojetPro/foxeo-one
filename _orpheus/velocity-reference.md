# Orpheus — Velocity Reference: Foxeo One

> Premier projet de reference pour calibrer les estimations de temps Orpheus.
> Projet: SaaS B2B multi-tenant, stack Next.js 16 + Supabase + Turborepo monorepo.
> Developpeur: MiKL (operateur solo) + Claude Code (AI pair-programming).
> Periode: 8 fevrier — 5 mars 2026 (25 jours calendaires, ~18 jours effectifs).

## Contexte de travail

- **Mode**: Developpeur solo + Claude Code (agent AI). MiKL pilote, Claude implemente.
- **Pipeline**: Story → Dev → Tests → Code Review adversarial → Fix → Re-test → Commit → Push
- **Workflow BMAD**: Planification complete en amont (PRD, Architecture, Epics/Stories, UX Design) avant toute ligne de code.
- **Complexite projet**: SaaS B2B multi-dashboard (Hub/Lab/One), multi-tenant, RLS, Realtime, modules plug & play.

## Donnees brutes par story

### Epic 1 — Fondation Plateforme & Authentification

| # | Story | Date commit | Delta vs precedent | Fichiers | Insertions | Suppressions | Net | Tests |
|---|-------|-------------|-------------------|----------|------------|-------------|-----|-------|
| 1 | 1.1 — Setup monorepo & dashboard shell | 10/02 12:46 | 0h45 | 86 | +3,593 | -6,678 | -3,085 | — |
| 2 | 1.2 — Migrations Supabase fondation | 10/02 15:08 | 2h22 | 18 | +1,845 | -715 | +1,130 | — |
| 3 | 1.3 — Auth client (login, signup, sessions) | 10/02 16:07 | 0h59 | 21 | +1,450 | -139 | +1,311 | — |
| 4 | 1.4 — Auth MiKL (login + 2FA, middleware) | 11/02 11:33 | 19h26* | 23 | +2,617 | -75 | +2,542 | — |
| 5 | 1.5 — RLS & isolation multi-tenant | 11/02 12:17 | 0h44 | 11 | +1,619 | -33 | +1,586 | — |
| 6 | 1.6 — Sessions avancees (multi-device) | 11/02 15:09 | 2h53 | 22 | +1,883 | -8 | +1,875 | — |
| 7 | 1.7 — Design system fondation | 11/02 16:32 | 1h22 | 20 | +1,311 | -210 | +1,101 | — |
| 8 | 1.8 — UX transversale | 11/02 17:49 | 1h17 | 64 | +1,528 | -814 | +714 | — |
| 9 | 1.9 — Consentements & legal | 12/02 12:56 | 19h07* | 26 | +2,527 | -17 | +2,510 | — |
| 10 | 1.10 + 2.1 + 2.2 — i18n + CRM liste + creation client | 13/02 12:49 | 23h53* | 108 | +10,874 | -621 | +10,253 | — |

### Epic 2 — Gestion Relation Client CRM Hub

| # | Story | Date commit | Delta vs precedent | Fichiers | Insertions | Suppressions | Net | Tests |
|---|-------|-------------|-------------------|----------|------------|-------------|-----|-------|
| 11 | 2.3 — Fiche client multi-onglets | 13/02 15:57 | 3h08 | 39 | +2,803 | -262 | +2,541 | 134 |
| 12 | 2.4 — Parcours Lab, assignation, toggles | 15/02 18:09 | 50h12* | 38 | +3,462 | -92 | +3,370 | 208 |
| 13 | 2.5 — Integration Cursor | 15/02 18:26 | 0h17 | 9 | +506 | -27 | +479 | — |
| 14 | 2.6 — Notes privees, epinglage clients | 15/02 19:30 | 1h03 | 38 | +2,478 | -70 | +2,408 | 284 |
| 15 | 2.7 — Rappels, calendrier deadlines | 15/02 21:38 | 2h09 | 31 | +3,111 | -457 | +2,654 | 312 |
| 16 | 2.8 — Statistiques globales, temps passe | 15/02 23:11 | 1h33 | 36 | +2,755 | -39 | +2,716 | 389 |
| 17 | 2.9a — Suspendre & reactiver client | 16/02 15:08 | 15h57* | 30 | +1,707 | -119 | +1,588 | 1,018 |
| 18 | 2.9b — Cloturer & archiver client | 16/02 16:01 | 0h52 | 24 | +1,426 | -66 | +1,360 | 476 |
| 19 | 2.9c — Upgrade client Ponctuel → Lab/One | 17/02 11:20 | 19h19* | 26 | +1,461 | -40 | +1,421 | 1,086 |
| 20 | 2.10 — Alertes inactivite & import CSV | 17/02 14:04 | 2h44 | 27 | +2,647 | -57 | +2,590 | 562 |

### Epic 3 — Communication Temps Reel & Notifications

| # | Story | Date commit | Delta vs precedent | Fichiers | Insertions | Suppressions | Net | Tests |
|---|-------|-------------|-------------------|----------|------------|-------------|-----|-------|
| 21 | 3.1 — Chat messagerie temps reel | 17/02 15:02 | 0h58 | 53 | +3,273 | -54 | +3,219 | 1,193 |
| 22 | 3.2 — Notifications in-app temps reel | 17/02 15:40 | 0h38 | 42 | +2,118 | -124 | +1,994 | 1,246 |
| 23 | 3.3 — Notifications email Resend | 17/02 16:55 | 1h15 | 23 | +1,562 | -42 | +1,520 | 1,280 |
| 24 | **FIX** — Code review 2-4/2-5/2-6 + bug operator_id | 17/02 21:53 | 4h58 | 62 | +1,076 | -277 | +799 | 1,291 |
| 25 | 3.4 — Preferences notification | 18/02 12:22 | 14h29* | 29 | +2,374 | -45 | +2,329 | 96 |
| 26 | 3.5 — Presence en ligne Realtime | 18/02 14:19 | 1h57 | 30 | +1,107 | -60 | +1,047 | 1,376 |
| 27 | 3.6 — Conflits modification concurrente | 18/02 14:38 | 0h19 | 12 | +599 | -28 | +571 | 1,402 |
| 28 | 3.7 — Support client & aide en ligne | 18/02 15:18 | 0h40 | 39 | +2,158 | -57 | +2,101 | 1,450 |

### Epic 4 — Gestion Documentaire

| # | Story | Date commit | Delta vs precedent | Fichiers | Insertions | Suppressions | Net | Tests |
|---|-------|-------------|-------------------|----------|------------|-------------|-----|-------|
| 29 | 4.1 — Module Documents migration & upload | 18/02 16:12 | 0h53 | 42 | +2,667 | -55 | +2,612 | 1,516 |
| 30 | 4.2 — Viewer HTML & telechargement PDF | 18/02 17:59 | 1h47 | 36 | +2,136 | -6 | +2,130 | 1,570 |
| 31 | 4.3 — Partage documents MiKL-client | 19/02 15:42 | 21h43* | 22 | +1,568 | -13 | +1,555 | 1,612 |
| 32 | 4.4 — Dossiers & recherche documents | 20/02 11:29 | 19h46* | 42 | +3,386 | -29 | +3,357 | 1,675 |
| 33 | 4.5+4.6 — Sync ZIP BMAD & autosave brouillons | 20/02 17:35 | 6h06 | 40 | +2,492 | -203 | +2,289 | 1,713 |
| 34 | 4.7 — Export documents CSV/JSON/PDF | 21/02 18:29 | 24h53* | 22 | +1,374 | -33 | +1,341 | 1,749 |

### Epic 5 — Visioconference & Onboarding Prospect

| # | Story | Date commit | Delta vs precedent | Fichiers | Insertions | Suppressions | Net | Tests |
|---|-------|-------------|-------------------|----------|------------|-------------|-----|-------|
| 35 | 5.1 — Module Visio, salle OpenVidu | 22/02 15:15 | 20h46* | 58 | +3,288 | -59 | +3,229 | 1,830 |
| 36 | 5.2 — Enregistrement & transcription auto | 22/02 15:59 | 0h44 | 44 | +2,539 | -61 | +2,478 | 1,895 |
| 37 | 5.3 — Demande visio, RDV Cal.com | 22/02 16:50 | 0h50 | 43 | +2,849 | -62 | +2,787 | 1,997 |
| 38 | 5.4 — Flux post-visio onboarding prospect | 23/02 14:40 | 21h50* | 40 | +2,608 | -48 | +2,560 | 2,083 |
| 39 | 5.5 — Ecran bienvenue, tutoriel Lab | 23/02 15:10 | 0h30 | 19 | +1,576 | -47 | +1,529 | 2,129 |
| 40 | 5.6 — Ecran graduation Lab → One | 24/02 11:35 | 20h24* | 29 | +1,817 | -77 | +1,740 | 2,183 |

### Epic 6 — Parcours Lab, Accompagnement Creation

| # | Story | Date commit | Delta vs precedent | Fichiers | Insertions | Suppressions | Net | Tests |
|---|-------|-------------|-------------------|----------|------------|-------------|-----|-------|
| 41 | 6.1 — Module Parcours Lab, vue progression | 24/02 15:10 | 3h35 | 35 | +2,423 | -46 | +2,377 | 2,229 |
| 42 | 6.2 — Consultation briefs, teasing One | 24/02 15:56 | 0h45 | 24 | +2,428 | -172 | +2,256 | 2,271 |
| 43 | 6.4 — Elio Lab conversation guidee | 26/02 11:52 | 43h56* | 29 | +1,883 | -43 | +1,840 | 2,362 |
| 44 | 6.3+6.5 — Soumission brief + generation auto | 26/02 12:31 | 0h38 | 46 | +4,774 | -68 | +4,706 | 2,395 |
| 45 | 6.6 — Elio Lab config Orpheus | 26/02 13:04 | 0h32 | 24 | +1,863 | -44 | +1,819 | 2,423 |

### Epic 7 — Validation Hub

| # | Story | Date commit | Delta vs precedent | Fichiers | Insertions | Suppressions | Net | Tests |
|---|-------|-------------|-------------------|----------|------------|-------------|-----|-------|
| 46 | 7.1 — Structure types & file attente | 26/02 14:30 | 1h25 | 22 | +1,639 | -42 | +1,597 | 2,451 |
| 47 | 7.2 — Vue detaillee demande | 26/02 15:41 | 1h11 | 39 | +3,506 | -295 | +3,211 | 2,535 |
| 48 | 7.3 — Validation/refus avec commentaire | 26/02 21:07 | 5h25 | 18 | +2,136 | -67 | +2,069 | 2,587 |
| 49 | 7.4 — Demande precisions soumission | 26/02 21:36 | 0h28 | 13 | +1,392 | -51 | +1,341 | 2,617 |
| 50 | 7.5 — Workflows post-decision | 26/02 22:10 | 0h34 | 9 | +1,117 | -65 | +1,052 | 2,681 |
| 51 | 7.6 — Temps reel compteur Realtime | 27/02 09:39 | 11h28* | 25 | +2,384 | -84 | +2,300 | 2,715 |

### Epic 8 — Agents IA Elio (Hub, Lab, One)

| # | Story | Date commit | Delta vs precedent | Fichiers | Insertions | Suppressions | Net | Tests |
|---|-------|-------------|-------------------|----------|------------|-------------|-----|-------|
| 52 | 8.1 — Consolidation infra Elio | 27/02 15:10 | 5h30 | 23 | +1,550 | -79 | +1,471 | 2,772 |
| 53 | 8.2 — Conversations, historique persistant | 02/03 12:06 | 68h55* | 26 | +2,310 | -135 | +2,175 | 2,801 |
| 54 | 8.3 — Feedback, documents chat, configs | 02/03 17:00 | 4h54 | 21 | +1,459 | -74 | +1,385 | 2,837 |
| 55 | 8.4 — Profil communication graduation | 04/03 10:31 | 41h31* | 21 | +2,064 | -64 | +2,000 | 2,921 |
| 56 | 8.5 — Elio Hub chat MiKL | 04/03 10:32 | 0h00 | 19 | +972 | -139 | +833 | 3,002 |
| 57 | 8.6 — Elio Hub correction & brouillons | 04/03 10:55 | 0h23 | 16 | +1,764 | -258 | +1,506 | 3,053 |
| 58 | 8.7 — Elio One chat FAQ guidance | 04/03 11:20 | 0h24 | 19 | +930 | -70 | +860 | 88† |
| 59 | 8.8 — Elio One collecte evolutions | 04/03 11:54 | 0h34 | 15 | +1,114 | -54 | +1,060 | 3,053 |
| 60 | 8.9a — Elio One+ tiers & actions modules | 04/03 12:22 | 0h27 | 21 | +1,278 | -246 | +1,032 | 122† |
| 61 | 8.9b — Elio One+ generation documents | 04/03 14:50 | 2h28 | 22 | +1,590 | -202 | +1,388 | 134† |
| 62 | 8.9c — Elio One+ alertes proactives | 04/03 15:02 | 0h12 | 14 | +1,293 | -52 | +1,241 | 51† |

> `†` = run partiel (fichiers de la story uniquement, pas full suite)

### Epic 9 — Graduation Lab→One & Cycle de Vie Client

| # | Story | Date commit | Delta vs precedent | Fichiers | Insertions | Suppressions | Net | Tests |
|---|-------|-------------|-------------------|----------|------------|-------------|-----|-------|
| 63 | 9.1 — Graduation declenchement & migration | 04/03 15:21 | 0h18 | 22 | +2,007 | -82 | +1,925 | 30† |
| 64 | 9.2 — Notification client & activation One | 04/03 15:47 | 0h25 | 19 | +1,574 | -156 | +1,418 | 90† |
| 65 | 9.3 — Abandon parcours Lab | 05/03 14:45 | 22h58* | 24 | +1,779 | -100 | +1,679 | 44† |
| 66 | 9.4 — Changement tier abonnement | 05/03 20:55 | 6h09 | 16 | +1,225 | -80 | +1,145 | 40† |
| 67 | 9.5a — Export RGPD donnees client | 05/03 21:19 | 0h24 | 18 | +2,021 | -256 | +1,765 | 18† |
| 68 | 9.5b — Transfert instance One | 05/03 21:41 | 0h22 | 20 | +1,815 | -106 | +1,709 | 89† |
| 69 | 9.5c — Anonymisation & retention donnees | 05/03 22:10 | 0h28 | 20 | +1,491 | -260 | +1,231 | 130† |

> `*` = inclut une nuit ou un week-end — temps reel de dev significativement inferieur au delta.
> `†` = run partiel (fichiers de la story uniquement, pas full suite). Tests cumules ~3,476+.

### Epic 10 — Dashboard One & Modules Commerciaux

| # | Story | Date commit | Delta vs precedent | Fichiers | Insertions | Suppressions | Net | Tests |
|---|-------|-------------|-------------------|----------|------------|-------------|-----|-------|
| 72 | 10.1 — Dashboard One accueil personnalise navigation | 06/03 16:50 | 17h40* | 18 | +1,116 | -69 | +1,047 | 40† |
| 73 | 10.2 — Documents herites Lab livrables teasing | 06/03 17:22 | 0h32 | 17 | +1,020 | -17 | +1,003 | 44† |
| 74 | 10.3 — Config modules actifs injection doc Elio | 07/03 11:31 | 18h09* | 15 | +1,866 | -8 | +1,858 | 43† |
| 75 | 10.4 — Personnalisation branding dashboard One | 07/03 11:53 | 0h22 | 20 | +1,611 | -31 | +1,580 | 70† |

> `*` = inclut une nuit — temps reel de dev significativement inferieur au delta.
> `†` = run partiel (fichiers de la story uniquement, pas full suite). Tests cumules ~3,600+.

### Epic 11 — Facturation & Abonnements Pennylane

| # | Story | Date commit | Delta vs precedent | Fichiers | Insertions | Suppressions | Net | Tests |
|---|-------|-------------|-------------------|----------|------------|-------------|-----|-------|
| 76 | 11.1 — Module Facturation structure types Pennylane | 07/03 | — | 18 | +2,128 | -17 | +2,111 | 50† |
| 77 | 11.2 — Edge Function billing-sync polling Pennylane | 07/03 | — | 9 | +1,359 | -1 | +1,358 | 21† |
| 78 | 11.3 — Création envoi devis MiKL Pennylane | 07/03 | — | 21 | +2,014 | -11 | +2,003 | 33† |
| 79 | 11.4 — Abonnements récurrents gestion échecs paiement | 07/03 | — | 11 | +2,125 | -18 | +2,107 | 59† |
| 80 | 11.5 — Historique facturation avoirs vue financière Hub | 08/03 | — | 17 | +1,552 | -13 | +1,539 | 40† |
| 81 | 11.6 — Facturation Lab 199€ paiement forfait déduction setup One | 08/03 | 0h22 | 19 | +988 | -21 | +967 | 47† |

> `†` = run partiel (fichiers de la story uniquement, pas full suite). Tests cumules ~3,919+.

### Epic 12 — Administration, Analytics & Templates

| # | Story | Date commit | Delta vs precedent | Fichiers | Insertions | Suppressions | Net | Tests |
|---|-------|-------------|-------------------|----------|------------|-------------|-----|-------|
| 82 | 12.1 — Module Admin logs activite mode maintenance | 08/03 16:47 | 0h18 | 21 | +1,529 | -7 | +1,522 | 99† |
| 83 | 12.2 — Export complet donnees client backups automatiques | 08/03 17:02 | 0h15 | 12 | +1,094 | -1 | +1,093 | 17† |
| 84 | 12.3 — Templates reutilisables parcours Lab emails auto | 08/03 17:27 | 0h25 | 22 | +2,390 | -3 | +2,387 | 30† |
| 85 | 12.4 — Analytics metriques usage dashboard Hub | 08/03 17:52 | 0h25 | 19 | +1,426 | -1 | +1,425 | 20† |
| 86 | 12.5a — Monitoring sante systeme alertes dysfonctionnement | 09/03 15:15 | ~0h25 | 10 | +1,057 | -4 | +1,053 | 30† |
| 87 | 12.5b — Preparation integrations P2 webhooks API | 09/03 15:38 | ~0h23 | 10 | +354 | -8 | +346 | 12† |
| 88 | 12.6 — Provisioning instance One depuis le Hub | 10/03 09:27 | ~18h | 14 | +1,846 | -7 | +1,839 | 33† |

> `†` = run partiel (fichiers de la story uniquement, pas full suite). Tests cumules ~4,115+.

## Totaux du projet

| Metrique | Valeur |
|----------|--------|
| Stories livrees | **88** (86 commits, dont 2 doubles et 1 triple) |
| Commits de correction post-story | **1** (code review retroactif + bug systemic) |
| Fichiers totaux modifies | **2,275** |
| Lignes inserees | **+172,350** |
| Lignes supprimees | **-15,269** |
| Lignes nettes ajoutees | **+157,081** |
| Tests finaux | **~4,160+** |
| Duree calendaire | **31 jours** (8 fev — 10 mars) |
| Jours effectifs de dev | **~23 jours** |

### Totaux par epic

| Epic | Stories | Fichiers | Insertions | Suppressions | Net | Tests ajoutes |
|------|---------|----------|------------|-------------|-----|--------------|
| **1** (Fondation) | 10 | 399 | +31,247 | -9,354 | +21,893 | — |
| **2** (CRM Hub) | 10 | 298 | +24,351 | -1,414 | +22,937 | +562 |
| **3** (Communication) | 7+fix | 290 | +14,068 | -737 | +13,331 | +888 |
| **4** (Documents) | 7 | 204 | +13,623 | -339 | +13,284 | +299 |
| **5** (Visio & Onboarding) | 6 | 233 | +14,677 | -354 | +14,323 | +733 |
| **6** (Parcours Lab) | 6 | 158 | +13,371 | -373 | +12,998 | +973 |
| **7** (Validation Hub) | 6 | 126 | +12,174 | -604 | +11,570 | +292 |
| **8** (Agents IA Elio) | 11 | 217 | +16,324 | -1,373 | +14,951 | ~761 |
| **9** (Cycle de vie) | 7 | 139 | +11,912 | -1,040 | +10,872 | ~441 |
| **10** (Dashboard One) | 4/4 | 70 | +5,613 | -125 | +5,488 | ~197 |
| **11** (Facturation Pennylane) | 6/6 | 95 | +10,166 | -81 | +10,085 | 250 |
| **12** (Admin Analytics Templates) | 7/9 | 108 | +9,696 | -31 | +9,665 | 241 |

## Classification des stories par type

### Infrastructure / Setup (fondations)
| Story | Delta brut | Fichiers | Net lignes | Complexite estimee |
|-------|-----------|----------|-----------|-------------------|
| 1.1 Setup monorepo | 0h45 | 86 | -3,085 | Haute (restructuration) |
| 1.2 Migrations Supabase | 2h22 | 18 | +1,130 | Moyenne |
| 1.5 RLS isolation | 0h44 | 11 | +1,586 | Haute (securite critique) |
| 8.1 Consolidation infra Elio | 5h30 | 23 | +1,471 | Haute (refactoring) |

### Authentification / Securite
| Story | Delta brut | Fichiers | Net lignes | Complexite estimee |
|-------|-----------|----------|-----------|-------------------|
| 1.3 Auth client | 0h59 | 21 | +1,311 | Moyenne |
| 1.4 Auth MiKL + 2FA | — (nuit) | 23 | +2,542 | Haute |
| 1.6 Sessions avancees | 2h53 | 22 | +1,875 | Haute |
| 1.9 Consentements legal | — (nuit) | 26 | +2,510 | Moyenne |

### UI / UX / Design System
| Story | Delta brut | Fichiers | Net lignes | Complexite estimee |
|-------|-----------|----------|-----------|-------------------|
| 1.7 Design system | 1h22 | 20 | +1,101 | Moyenne |
| 1.8 UX transversale | 1h17 | 64 | +714 | Moyenne |
| 5.5 Ecran bienvenue Lab | 0h30 | 19 | +1,529 | Basse-Moyenne |
| 5.6 Ecran graduation Lab→One | — (nuit) | 29 | +1,740 | Moyenne |

### CRUD / Module metier (CRM, Documents)
| Story | Delta brut | Fichiers | Net lignes | Complexite estimee |
|-------|-----------|----------|-----------|-------------------|
| 1.10+2.1+2.2 i18n+CRM | — (nuit) | 108 | +10,253 | Tres haute (3 stories) |
| 2.3 Fiche client | 3h08 | 39 | +2,541 | Moyenne-Haute |
| 2.4 Parcours Lab | — (week-end) | 38 | +3,370 | Haute |
| 2.6 Notes, epinglage | 1h03 | 38 | +2,408 | Moyenne |
| 4.1 Module Documents upload | 0h53 | 42 | +2,612 | Moyenne-Haute |
| 4.2 Viewer documents | 1h47 | 36 | +2,130 | Moyenne |
| 4.4 Dossiers & recherche | — (nuit) | 42 | +3,357 | Haute |

### Fonctionnalites avancees (temps reel, lifecycle, IA)
| Story | Delta brut | Fichiers | Net lignes | Complexite estimee |
|-------|-----------|----------|-----------|-------------------|
| 2.9a Suspendre client | — (nuit) | 30 | +1,588 | Haute (lifecycle) |
| 2.9b Cloturer client | 0h52 | 24 | +1,360 | Haute (lifecycle) |
| 2.9c Upgrade client | — (nuit) | 26 | +1,421 | Haute (lifecycle) |
| 3.1 Chat temps reel | 0h58 | 53 | +3,219 | Tres haute |
| 3.2 Notifications in-app | 0h38 | 42 | +1,994 | Haute |
| 3.5 Presence Realtime | 1h57 | 30 | +1,047 | Haute |
| 3.6 Conflits concurrence | 0h19 | 12 | +571 | Moyenne |
| 5.1 Module Visio OpenVidu | — (nuit) | 58 | +3,229 | Tres haute |
| 5.2 Enregistrement visio | 0h44 | 44 | +2,478 | Haute |
| 5.3 RDV Cal.com | 0h50 | 43 | +2,787 | Haute |
| 7.2 Vue detaillee demande | 1h11 | 39 | +3,211 | Haute |
| 9.1 Graduation migration | 0h18 | 22 | +1,925 | Haute (cross-module) |
| 9.2 Notification & activation | 0h25 | 19 | +1,418 | Haute (cross-module) |
| 9.5a Export RGPD | 0h24 | 18 | +1,765 | Haute (securite/legal) |
| 9.5b Transfert instance | 0h22 | 20 | +1,709 | Haute (infrastructure) |
| 9.5c Anonymisation donnees | 0h28 | 20 | +1,231 | Haute (securite/legal) |

### Agent IA (Elio)
| Story | Delta brut | Fichiers | Net lignes | Complexite estimee |
|-------|-----------|----------|-----------|-------------------|
| 6.4 Elio Lab conversation guidee | — (nuit) | 29 | +1,840 | Haute |
| 6.3+6.5 Soumission + generation briefs | 0h38 | 46 | +4,706 | Tres haute (2 stories) |
| 6.6 Elio config Orpheus | 0h32 | 24 | +1,819 | Moyenne |
| 8.2 Conversations historique | — (week-end) | 26 | +2,175 | Haute |
| 8.3 Feedback, documents chat | 4h54 | 21 | +1,385 | Moyenne |
| 8.4 Profil communication | — (nuit) | 21 | +2,000 | Haute |
| 8.5 Elio Hub chat MiKL | 0h00 | 19 | +833 | Moyenne |
| 8.6 Elio Hub correction brouillons | 0h23 | 16 | +1,506 | Moyenne |
| 8.7 Elio One chat FAQ | 0h24 | 19 | +860 | Moyenne |
| 8.8 Elio One evolutions | 0h34 | 15 | +1,060 | Moyenne |
| 8.9a Elio One+ tiers | 0h27 | 21 | +1,032 | Moyenne-Haute |
| 8.9b Elio One+ generation docs | 2h28 | 22 | +1,388 | Haute |
| 8.9c Elio One+ alertes | 0h12 | 14 | +1,241 | Moyenne |

### Validation & workflows
| Story | Delta brut | Fichiers | Net lignes | Complexite estimee |
|-------|-----------|----------|-----------|-------------------|
| 7.1 Structure types file attente | 1h25 | 22 | +1,597 | Moyenne |
| 7.3 Validation/refus commentaire | 5h25 | 18 | +2,069 | Moyenne-Haute |
| 7.4 Demande precisions | 0h28 | 13 | +1,341 | Basse-Moyenne |
| 7.5 Workflows post-decision | 0h34 | 9 | +1,052 | Moyenne |
| 7.6 Temps reel Realtime | — (nuit) | 25 | +2,300 | Haute |

### Lifecycle client
| Story | Delta brut | Fichiers | Net lignes | Complexite estimee |
|-------|-----------|----------|-----------|-------------------|
| 9.3 Abandon parcours Lab | — (nuit) | 24 | +1,679 | Haute |
| 9.4 Changement tier | 6h09 | 16 | +1,145 | Moyenne |

### Petites stories / Outils
| Story | Delta brut | Fichiers | Net lignes | Complexite estimee |
|-------|-----------|----------|-----------|-------------------|
| 2.5 Integration Cursor | 0h17 | 9 | +479 | Basse |
| 2.7 Rappels calendrier | 2h09 | 31 | +2,654 | Moyenne |
| 2.8 Statistiques | 1h33 | 36 | +2,716 | Moyenne |
| 3.7 Support client | 0h40 | 39 | +2,101 | Moyenne |
| 4.3 Partage documents | — (nuit) | 22 | +1,555 | Moyenne |
| 4.5+4.6 Sync + autosave | 6h06 | 40 | +2,289 | Haute (2 stories) |
| 4.7 Export documents | — (nuit) | 22 | +1,341 | Moyenne |
| 5.4 Flux post-visio | — (nuit) | 40 | +2,560 | Haute |

## Cout des corrections

| Type | Commit | Fichiers | Net lignes | Temps estime |
|------|--------|----------|-----------|-------------|
| Code review retroactif (3 stories) | d98f3cc | 62 | +799 | ~5h (4h58 delta) |

**Ratio correction / dev**: Ce commit de correction represente environ **0.6%** du code net total (+799 / +131,843). A noter: depuis Epic 4, le pipeline integre le CR adversarial dans chaque story — plus besoin de corrections retroactives.

**Evolution positive**: Le passage au pipeline "CR integre par story" (depuis Epic 4) a elimine les corrections retroactives. Le buffer de 15-25% reste recommande pour les bugs systemiques decouverts tardivement.

## Velocite de reference — Temps machine (Claude Code)

> **IMPORTANT**: Ces temps representent le temps **machine** (Claude Code execute, MiKL supervise).
> Le temps humain reel = temps machine + temps de pilotage + pauses + decisions.

### Par taille de story (temps machine estime, hors nuits) — calibre sur 71 stories

| Taille | Criteres | Temps machine moyen | Exemples |
|--------|----------|-------------------|----------|
| **XS** | <10 fichiers, <500 lignes net | ~15 min | 2.5 (Cursor), 3.6 (conflits), 8.9c (alertes), 9.1 (graduation) |
| **S** | 10-25 fichiers, 500-1,500 lignes net | ~30 min | 1.3, 1.5, 2.9b, 7.4, 7.5, 8.5, 8.7, 8.8, 9.2, 9.4, 9.5a, 9.5b, 9.5c |
| **M** | 25-40 fichiers, 1,500-2,800 lignes net | ~1h15 | 1.6, 2.3, 2.6, 2.7, 3.4, 3.5, 3.7, 4.2, 4.3, 6.1, 6.2, 6.6, 7.1, 7.3, 8.2, 8.3, 8.4, 8.6 |
| **L** | 40-70 fichiers, 2,800-4,000 lignes net | ~2h00 | 2.4, 3.1, 4.1, 4.4, 4.5+4.6, 5.2, 5.3, 5.4, 7.2 |
| **XL** | 70+ fichiers, 4,000+ lignes net | ~3h+ | 1.10+2.1+2.2 (triple), 6.3+6.5 (double) |

> **Observation**: La velocite s'est amelioree d'~25% entre Epics 1-3 et Epics 7-9 grace aux patterns etablis et au pipeline rode.

### Multiplicateurs a appliquer

| Facteur | Multiplicateur | Raison |
|---------|---------------|--------|
| Temps humain vs machine | x1.5 — x2.0 | Pilotage, decisions, reviews manuelles |
| Premiere story d'un type | x1.3 | Pas de patterns existants a suivre |
| Securite / Auth / RLS | x1.4 | Tests supplementaires, criticite |
| Temps reel / Realtime | x1.3 | Complexite infrastructure |
| Multi-tenant | x1.2 | Tests isolation |
| Agent IA (Elio) | x1.2 | Logique de detection d'intent, mocks complexes |
| Lifecycle / cross-module | x1.3 | Coordination entre modules, migrations |
| Corrections post-epic | +15% sur l'epic | Buffer code review + bugs (reduit de 20% → 15% grace au CR integre) |

### Acceleration observee par phase

| Phase | Epics | Stories/jour effectif | Net lignes/jour |
|-------|-------|----------------------|----------------|
| **Setup** | 1-3 | ~3.5 | ~7,100 |
| **Modules metier** | 4-6 | ~3.8 | ~7,500 |
| **Workflows & IA** | 7-9 | ~4.5 | ~8,200 |

## Formule d'estimation Orpheus (v0.2)

```
Temps_estime = Temps_base(taille) × Multiplicateur(type) × Multiplicateur(contexte) + Buffer_corrections

Ou:
- Temps_base: XS=15min, S=30min, M=1h15, L=2h00, XL=3h+
- Multiplicateur(type): Auth=1.4, Realtime=1.3, AgentIA=1.2, CRUD=1.0, UI=0.9, Integration=0.8
- Multiplicateur(contexte): 1er projet=1.3, patterns existants=1.0, refacto=1.2, cross-module=1.3
- Buffer_corrections: +15% par epic pour corrections post-delivery
```

> **Changement v0.1 → v0.2**: Temps de base reduits (~25%) grace a l'acceleration observee. Ajout multiplicateur AgentIA (x1.2) et cross-module (x1.3). Buffer corrections reduit de 20% → 15% grace au CR integre.

### Exemple d'application

> **Story**: "Ajouter un module de facturation avec paiement Stripe"
> - Taille estimee: L (40+ fichiers, ~3,000 lignes)
> - Type: Integration externe (x1.0) + CRUD (x1.0)
> - Contexte: Nouveau module mais patterns existants (x1.0)
> - Temps_base: 2h00 machine
> - Temps humain: 2h00 × 1.75 = ~3h30
> - Avec buffer corrections: 3h30 + 15% = ~4h00

## Notes pour calibration future

1. **Ce referentiel couvre 80 stories sur 11 epics**. Il sera complete avec les epics 11-12.
2. **Les temps delta qui incluent des nuits ne sont PAS des temps de dev**. Utiliser uniquement les deltas courts (meme journee) comme reference fiable.
3. **La velocite augmente au fil du projet** : confirmee par les donnees (+25% entre phase 1 et phase 3). Les patterns etablis, le pipeline rode et la base de code mature accelerent chaque story.
4. **L'effet Claude Code est significatif** : un dev solo humain sans AI pair-programming serait probablement 3-5x plus lent sur ces memes stories.
5. **Les stories groupees** (1.10+2.1+2.2, 4.5+4.6, 6.3+6.5) faussent les metriques individuelles — eviter a l'avenir.
6. **Le nombre de tests n'est pas toujours croissant** dans les commit messages — depuis Epic 8, les runs sont partiels (fichiers story uniquement) pour eviter les timeouts.
7. **Le pipeline CR integre** (depuis Epic 4) a elimine les corrections retroactives massives. Le cout des fixes CR est absorbe dans le delta de chaque story.
8. **Les stories Elio (Epic 8)** ont montre une velocite tres haute une fois les patterns de base etablis par 8.1-8.3 : les stories 8.5 a 8.9c se sont enchainees en <30 min chacune.

## Prochaines etapes

- [x] Ajouter les donnees des epics 4-9
- [ ] Ajouter les donnees des epics 10-12 au fur et a mesure
- [ ] Tracker separement le temps de correction par story (pas seulement par epic)
- [ ] Comparer avec d'autres projets pour calibrer les multiplicateurs
- [ ] Integrer Orpheus dans le workflow BMAD pour estimation automatique a la creation de story

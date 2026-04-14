---
stepsCompleted: [1, 2, 3, 4, 5, 6]
currentStep: 6
lastSession: "2026-02-08"
note: "Re-evaluation apres corrections Phases 1-3 du rapport precedent"
inputDocuments:
  prd:
    - "prd/index.md"
    - "prd/executive-summary.md"
    - "prd/product-scope.md"
    - "prd/success-criteria.md"
    - "prd/user-journeys.md"
    - "prd/domain-specific-requirements.md"
    - "prd/innovation-differentiation.md"
    - "prd/saas-b2b-specific-requirements.md"
    - "prd/project-scoping-phased-development.md"
    - "prd/functional-requirements-monprojetpro-plateforme.md"
    - "prd/non-functional-requirements.md"
    - "prd/types-de-clients.md"
    - "prd/architecture-documentaire.md"
    - "prd/architecture-agents-interconnects.md"
    - "prd/architecture-agents-ia-rvise.md"
    - "prd/architecture-flux-onboarding-client.md"
    - "prd/infrastructure-architecture-donnes.md"
    - "prd/stack-llm-cots-ia.md"
    - "prd/cas-client-rfrence-association.md"
    - "prd/systme-de-parcours-flexibles.md"
    - "prd/continuit-lio-lab-lio-one.md"
    - "prd/workflow-volutions-lio-one.md"
    - "prd/table-des-matires.md"
    - "prd/rcapitulatif-du-document.md"
    - "prd/statut-du-prd.md"
  architecture:
    - "architecture/index.md"
    - "architecture/01-project-context-analysis.md"
    - "architecture/02-platform-architecture.md"
    - "architecture/03-core-decisions.md"
    - "architecture/04-implementation-patterns.md"
    - "architecture/05-project-structure.md"
    - "architecture/06-validation-results.md"
    - "architecture/07-completion-summary.md"
  epics:
    - "epics.md"
  ux:
    - "ux-design-specification.md"
  supplements:
    - "monprojetpro-identite-strategie-retour.md"
    - "monprojetpro-modules-commerciaux.md"
    - "design-system-themes.css"
    - "orpheus-integration-notes.md"
    - "ui-resources.md"
    - "modules-et-stack-technique.md"
---

# Implementation Readiness Assessment Report (v2)

**Date:** 2026-02-08
**Project:** monprojetpro-dash
**Contexte:** Re-evaluation apres corrections des 3 phases identifiees dans le rapport v1

---

## Etape 1 — Document Discovery

### Inventaire des documents

| Type | Format | Fichiers | Doublons |
|------|--------|----------|----------|
| **PRD** | Sharde (25 fichiers) | `prd/index.md` + 24 sections | Aucun |
| **Architecture** | Sharde (8 fichiers) | `architecture/index.md` + 7 sections | Aucun |
| **Epics & Stories** | Whole (1 fichier) | `epics.md` (~270KB) | Aucun |
| **UX Design** | Whole (1 fichier) | `ux-design-specification.md` | Aucun |
| **Supplements** | 6 fichiers | Strategie, modules, CSS, Orpheus, UI, stack | Aucun |

**Issues :** Aucun doublon detecte. Tous les documents requis presents.

---

## Etape 2 — Analyse du PRD

### Functional Requirements (FRs)

**Total : 170 FRs numerotes** (+ 3 sous-IDs FR20b/c/d = 173 reels)

| # | Categorie | IDs | Nombre |
|---|-----------|-----|--------|
| 1 | Hub — Gestion Clients | FR1-FR7 | 7 |
| 2 | Hub — Validation Hub | FR8-FR14 | 7 |
| 3 | Orpheus (Cursor/BMAD, hors perimetre) | FR15-FR20d | 9 |
| 4 | Hub — Elio Hub | FR21-FR25 | 5 |
| 5 | Lab — Parcours Creation | FR26-FR31 | 6 |
| 6 | Lab — Elio Lab | FR32-FR37 | 6 |
| 7 | One — Structure Dashboard | FR38-FR43 | 6 |
| 8 | One — Elio One/One+ | FR44-FR51 | 8 |
| 9 | Commun — Auth & Securite | FR52-FR56 | 5 |
| 10 | Commun — Communication | FR57-FR61 | 5 |
| 11 | Commun — Documents | FR62-FR65 | 4 |
| 12 | Commun — Profil Communication | FR66-FR69 | 4 |
| 13 | Onboarding & Parcours | FR70-FR73 | 4 |
| 14 | Graduation Lab→One | FR74-FR76 | 3 |
| 15 | Gestion MiKL Avancee | FR77-FR81 | 5 |
| 16 | Gestion Erreurs & Edge Cases | FR82-FR85 | 4 |
| 17 | Synchronisation & Technique | FR86-FR87 | 2 |
| 18 | Parcours Alternatifs & Cycle de Vie | FR88-FR93 | 6 |
| 19 | Facturation & Abonnements | FR94-FR98 | 5 |
| 20 | Notifications & Preferences | FR99-FR101 | 3 |
| 21 | Administration & Monitoring | FR102-FR105 | 4 |
| 22 | Recherche & Navigation | FR106-FR108 | 3 |
| 23 | Support & Feedback | FR109-FR111 | 3 |
| 24 | Multi-Device & Sessions | FR112-FR114 | 3 |
| 25 | Preparation Integrations | FR115-FR116 | 2 |
| 26 | Accessibilite & Responsive | FR117-FR119 | 3 |
| 27 | Analytics & Metriques | FR120-FR121 | 2 |
| 28 | Experience Elio Detaillee | FR122-FR126 | 5 |
| 29 | Temps Reel & Synchronisation | FR127-FR129 | 3 |
| 30 | Workflow MiKL Quotidien | FR130-FR133 | 4 |
| 31 | Feedback & UX | FR134-FR136 | 3 |
| 32 | Templates & Personnalisation | FR137-FR139 | 3 |
| 33 | Legal & Consentements | FR140-FR143 | 4 |
| 34 | Gestion des Fichiers | FR144-FR146 | 3 |
| 35 | Etat Systeme & Monitoring | FR147-FR148 | 2 |
| 36 | Import/Export Avance | FR149-FR150 | 2 |
| 37 | Robustesse Technique | FR151-FR152 | 2 |
| 38 | Propriete Client & Instance Dediee | FR153-FR157 | 5 |
| 39 | Documentation comme Livrable | FR158-FR161 | 4 |
| 40 | Surveillance Usage & Upgrade | FR162-FR165 | 4 |
| 41 | Graduation Instance Dediee | FR166-FR168 | 3 |
| 42 | Lab — Facturation Forfait | FR169-FR170 | 2 |

**Numerotation :** Aucun gap dans la sequence FR1-FR170. 3 sous-IDs non standard (FR20b/c/d) pour Orpheus.

### Non-Functional Requirements (NFRs)

**Total : 39 NFRs**

| Categorie | IDs | Nombre |
|-----------|-----|--------|
| Performance | NFR-P1 a NFR-P6 | 6 |
| Securite | NFR-S1 a NFR-S9 | 9 |
| Scalabilite | NFR-SC1 a NFR-SC4 | 4 |
| Accessibilite | NFR-A1 a NFR-A4 | 4 |
| Integrations | NFR-I1 a NFR-I5 | 5 |
| Fiabilite & Disponibilite | NFR-R1 a NFR-R6 | 6 |
| Maintenabilite & Qualite Code | NFR-M1 a NFR-M5 | 5 |

### Exigences supplementaires detectees

| Exigence | Source | Severite |
|----------|--------|----------|
| **Flux onboarding prospect** (Cal.com, salle d'attente, visio, post-visio, creation compte) — ~10-12 FRs potentiels non numerotes | `architecture-flux-onboarding-client.md` | A evaluer |
| Protections securite defensives (CSRF, XSS, CSP, DDoS, headers) — non formalisees en NFRs | `domain-specific-requirements.md` | Moyenne |
| FR20b/c/d non comptees dans le total annonce (170 vs 173 reel) | `functional-requirements` | Faible |
| Facturation electronique PDP sept. 2026 — pas de FR/NFR dedie | `saas-b2b-specific-requirements.md` | Moyenne |

### PRD Completeness Assessment

| Critere | Score | Detail |
|---------|-------|--------|
| Couverture fonctionnelle plateforme | 9/10 | 170 FRs couvrant Hub, Lab, One, Commun, Instance-per-client |
| Couverture non-fonctionnelle | 8/10 | 39 NFRs, protections securite defensives non formalisees |
| Coherence nomenclature | 9/10 | Nomenclature alignee (Ponctuel/Lab/Essentiel/Agentique, One/One+) |
| Numerotation | 9/10 | Continue sans gaps, seul FR20b/c/d en sous-IDs |
| Flux onboarding prospect | 6/10 | Documente en detail mais aucun FR numerote correspondant |
| Vision phasee | 9/10 | MVP / Growth / Vision bien delimitees |

**Note importante sur le flux onboarding prospect :** Le fichier `architecture-flux-onboarding-client.md` decrit un flux complet (prise de RDV Cal.com → salle d'attente → visio OpenVidu → post-visio avec statuts → creation compte) qui n'a pas de FRs dedies. Toutefois, ces elements sont en partie couverts par les stories existantes des Epics 3 (Visio), 4 (Hub CRM) et 5 (Communication). L'evaluation de couverture reelle sera faite a l'etape 3.

---

## Etape 3 — Epic Coverage Validation

### Couverture par Epic

| Epic | Titre | Stories | FRs couverts | Total FRs |
|------|-------|---------|-------------|-----------|
| 1 | Fondation Plateforme & Auth | 10 | FR52-56, FR73, FR82, FR108, FR112-114, FR117-119, FR134, FR140-143, FR151-152 | 21 |
| 2 | CRM Hub | 12 | FR1-7, FR79-81, FR84-85, FR89-90, FR106, FR130-133, FR149 | 20 |
| 3 | Communication & Notifications | 7 | FR57, FR61, FR99-101, FR109-111, FR127-129 | 11 |
| 4 | Gestion Documentaire | 7 | FR62-65, FR86, FR107, FR135-136, FR144-146, FR150 | 12 |
| 5 | Visio & Onboarding Prospect | 6 | FR58-60, FR70-72 | 6 |
| 6 | Parcours Lab | 6 | FR26-37 | 12 |
| 7 | Validation Hub | 6 | FR8-14 | 7 |
| 8 | Agents IA Elio | 11 | FR21-25, FR44-51, FR66-69, FR83, FR87, FR122-126 | 24 |
| 9 | Graduation & Cycle de Vie | 5 | FR74-76, FR88, FR91-93, FR157, FR161, FR166-168 | 12 |
| 10 | Dashboard One & Modules | 4 | FR38-43, FR139 | 7 |
| 11 | Facturation & Abonnements | 5 | FR77-78, FR94-98, FR169-170 | 9 |
| 12 | Admin, Analytics, Templates & Monitoring | 9 | FR102-105, FR115-116, FR120-121, FR137-138, FR147-148, FR153, FR156, FR158-165 | 22 |

### FRs hors perimetre (Orpheus)

9 FRs exclus : FR15-FR20, FR20b, FR20c, FR20d — operent dans Cursor/BMAD, pas dans la plateforme MonprojetPro.

### FRs en GAP (non couverts par aucune story)

| FR | Description | Mappe en header | Probleme |
|----|-------------|-----------------|----------|
| **FR154** | Client One proprietaire de son code et ses donnees | Epic 10 header | Present dans le header et le coverage map, mais AUCUNE story ne l'implemente avec des acceptance criteria |
| **FR155** | Communication Hub↔One via API REST + HMAC | Epic 1 header | Present dans le header et le coverage map, mais aucune story dediee. Le mecanisme HMAC est mentionne dans Stories 9.1 et 12.6 en contexte, mais FR155 n'est formellement assigne nulle part |

### Doublons intentionnels (multi-stories)

| FR | Stories | Justification |
|----|---------|---------------|
| FR14 | 7.3 + 7.4 + 7.6 | Implementation progressive de la notification auto |
| FR89 | 2.9a + 2.9b | Suspension (a) et cloture (b) couvrent 2 aspects du meme FR |
| FR161 | 9.5 + 12.8 | Documentation transversale entre graduation et admin |

### Statistiques de couverture

| Metrique | Valeur |
|----------|--------|
| Total FRs PRD | 170 (+ 3 sous-IDs FR20b/c/d) |
| FRs hors perimetre (Orpheus) | 9 |
| FRs in-scope | 161 |
| FRs couverts par au moins 1 story | **159** |
| FRs en GAP | **2** (FR154, FR155) |
| Couverture | **98.8%** |

### Evaluation

La couverture est **quasi-complete** a 98.8%. Les 2 gaps identifies (FR154 et FR155) sont des FRs structurants du modele instance-per-client qui ont ete mappes dans les headers d'epic et les coverage maps mais jamais formellement assignes a des stories avec des acceptance criteria.

**Recommandations :**
- FR155 (API Hub↔One + HMAC) : Ajouter a Story 12.6 (provisioning) ou creer Story 1.11 dediee
- FR154 (propriete client) : Ajouter comme acceptance criteria dans Story 9.5 (export/transfert) ou Story 10.1 (dashboard One)

---

## Etape 4 — UX Alignment

### UX Document Status

**Trouve :** `ux-design-specification.md` — Document complet couvrant les 3 dashboards, 5 phases utilisateur, design system et interactions Elio.

### Scores d'alignement

| Axe | Score | Statut |
|-----|-------|--------|
| A. UX ↔ PRD | 8/10 | Quelques divergences (dashboard unifie vs separe, canaux) |
| B. UX ↔ Architecture | 9/10 | Tres bon alignement, details UX temps reel manquants |
| C. Palette et Design System | 9/10 | Minimal Futuriste bien aligne, anciennes palettes a nettoyer |
| D. Technologies et Services | 10/10 | Alignement parfait (OpenVidu, Supabase Storage, Pennylane, Cal.com) |
| E. Elements manquants/Contradictions | 7/10 | Lacunes a11y, responsive, pipeline doc |
| **Score global** | **8.6/10** | **MOSTLY ALIGNED** |

### Problemes identifies

#### Critiques
1. **Tableau initial UX (lignes 36-39)** utilise encore les anciennes couleurs (Bleu nuit+cuivre, Terracotta/Corail) au lieu de Minimal Futuriste (Cyan, Violet, Vert/Orange)
2. **Erreur tableau "Defining Experience"** (ligne 90) : "MonprojetPro-One" devrait etre "MonprojetPro-Hub" pour "Valider les soumissions Validation Hub"

#### Importants
3. **Dashboard Client Unifie (PRD) vs 3 dashboards separes (UX)** : Le PRD SaaS B2B definit un "Dashboard Client Unifie" avec sections conditionnelles; le UX presente 3 entites autonomes. L'architecture (2 apps: hub + client) confirme le PRD.
4. **Canaux de communication** : UX liste 4 canaux, PRD 5, Strategie 6 (ajoute Email). Le canal Email est absent du UX.
5. **Messages teasing** definis dans le PRD mais absents du UX.

#### Moyens
6. **Palettes initiales a supprimer** du UX (lignes 461-469) pour eviter la confusion avec Minimal Futuriste
7. **Accessibilite** : Aucun standard WCAG defini, pas de contraste minimum pour le dark mode
8. **Responsive** : "Desktop first" mentionne mais aucun breakpoint defini

#### Faibles
9. Skeleton loaders et chargement progressif (architecture) non refletes dans le UX
10. Pipeline Documentation Auto BMAD→Elio detaille dans le UX mais pas dans le PRD

### Verdict UX

L'alignement est **bon dans l'ensemble** (8.6/10). Les technologies et services sont parfaitement coherents apres les corrections de Phase 2. Les problemes restants sont principalement cosmetiques (anciennes palettes, erreur dans un tableau) et structurels (concept dashboard unifie vs separe, canaux incomplets).

---

## Etape 5 — Epic Quality Review

### Violations par severite

**Total : 26 violations** (5 critiques, 11 majeures, 10 mineures)

#### 🔴 Critiques (5)

| ID | Epic/Story | Description |
|----|-----------|-------------|
| **C-01** | 9.1 vs 12.6 | **Dependance circulaire Epic 9 ↔ Epic 12** : Le provisioning d'instance One est decrit dans les DEUX stories (9.1 et 12.6) avec des variations. Table `client_instances` creee sans migration formelle. L'implementeur ne sait pas quelle story est la reference. |
| **C-02** | 8.1 → 6.4-6.6 | **Refactoring implicite** : Story 8.1 refactorise le code Elio cree en 6.4-6.6. L'architecture unifiee Elio devrait etre definie AVANT l'implementation Lab, pas apres. |
| **C-03** | 9.1 | **AC irrealiste** : "repond en moins de 2 secondes" pour un provisioning qui prend ~5 minutes (confirme par Story 12.6). Contradiction directe. |
| **C-04** | 11.6 | **Numerotation cassee** : Epic 11 passe de Story 11.4 a 11.6. Story 11.5 n'existe pas. |
| **C-05** | 8.7 + 10.1 | **Contradiction dark/light mode** : Stories 8.7 et 10.1 disent "light mode" pour One, alors que Story 1.7 et les specs UX imposent un dark mode universel (fond #020402). |

#### 🟠 Majeurs (11)

| ID | Epic/Story | Description |
|----|-----------|-------------|
| **M-01** | Epic 1 | Titre "Fondation" a valeur technique. Story 1.10 (i18n P3) questionnable dans le MVP. |
| **M-02** | 2.9a/b/c | Stories artificiellement decoupees — 2.9b et 2.9c dependent de la migration creee en 2.9a. |
| **M-03** | 2.10 | Deux fonctionnalites sans rapport (alertes inactivite + import CSV) dans une seule story. |
| **M-04** | 2.4 → 6.1 | Forward dependency : Story 2.4 reference la table `parcours_templates` (migration 00009) qui n'est creee qu'en Story 6.1. |
| **M-05** | 8.4 | Perspective "agent IA" au lieu d'un utilisateur humain. |
| **M-06** | 9.5 | Story massive (>15 ACs) : export RGPD + transfert instance + archivage + anonymisation. Devrait etre 3 stories. |
| **M-07** | 12.6 vs 9.1 | Duplication massive du code de provisioning entre les deux stories. |
| **M-08** | 3.6 | "Conflits de modification concurrente" — mecanisme exact non specifie. |
| **M-09** | 6.6 vs 8.4 | Deux definitions contradictoires du profil de communication. Story 6.6 sera immediatement refactorisee par 8.4. |
| **M-10** | Epic 1 | FR155 (API Hub↔One + HMAC) declare dans le header mais aucune story ne l'implemente. |
| **M-11** | Epic 10 | FR154 (propriete client) declare dans le header mais aucune story ne le couvre. |

#### 🟡 Mineurs (10)

| ID | Description |
|----|-------------|
| m-01 | Story 12.5b devrait etre etiquetee "Technical Enabler" |
| m-02 | Story 1.5 utilise "operateur de la plateforme" au lieu de "MiKL (operateur)" |
| m-03 | Story 2.5 : cas d'erreur manquant si `bmad_base_path` non configure |
| m-04 | Story 3.7 : FAQ en dur dans le code, pas d'evolution prevue vers admin |
| m-05 | Story 7.1 : seul manifest a declarer des dependances, incoherence inter-modules |
| m-06 | Stories 8.9b et 8.9c tres courtes (3-4 ACs), granularite inhabituellement fine |
| m-07 | Story 2.3 : requete directe vers table `documents` sans passer par le module Documents |
| m-08 | Story 5.4 : relance cron sans monitoring/alerting si echec silencieux |
| m-09 | Story 12.2 : documentation backup differee indefiniment |
| m-10 | Migrations DB non numerotees de facon coherente (gaps 00012, 00013, tables sans numero) |

### Checklist par Epic

| Epic | User Value | Independence | Stories | ACs | Deps | Score |
|------|-----------|-------------|---------|-----|------|-------|
| 1 | ACCEPTABLE | OK | BON | BON | OK | 8/10 |
| 2 | BON | Forward ref Epic 6 | MOYEN | BON | PROBLEME | 6/10 |
| 3 | BON | OK | BON | BON | OK | 8/10 |
| 4 | BON | OK | BON | BON | OK | 8/10 |
| 5 | BON | OK | BON | BON | OK | 8/10 |
| 6 | BON | OK | MOYEN | BON | OK | 7/10 |
| 7 | BON | OK | BON | TRES BON | OK | **9/10** |
| 8 | BON | Refactor 6.x | MOYEN | BON | PROBLEME | 5/10 |
| 9 | BON | Circulaire avec 12 | FAIBLE | MOYEN | CRITIQUE | **3/10** |
| 10 | BON | OK | BON | BON | OK | 7/10 |
| 11 | BON | OK | BON | BON | OK | 7/10 |
| 12 | MOYEN | OK | MOYEN | BON | Duplication 9.1 | 5/10 |

### Points forts identifies

- Format Given/When/Then applique rigoureusement dans toutes les stories
- Niveau de detail technique exceptionnel (tables, types TypeScript, patterns architecturaux)
- Cas d'erreur systematiquement couverts dans la majorite des stories
- References NFR integrees dans les ACs (NFR-P1, NFR-S4, etc.)
- **Epic 7 (Validation Hub) = modele de qualite** (9/10)
- Couverture FR exhaustive et bien tracee (170 FRs, map de couverture complete)

### 3 problemes les plus urgents

1. **Dependance circulaire Epic 9 ↔ Epic 12** : Provisioning decrit dans 2 stories avec variations. Trancher une source de verite unique.
2. **Contradiction dark/light mode pour One** : UX impose dark mode universel, Epics 8 et 10 disent light mode.
3. **Architecture Elio : refactoring entre Epic 6 et 8** : L'architecture unifiee devrait etre definie AVANT l'implementation Lab.

---

## Etape 6 — Final Assessment

### Synthese des constatations

| Etape | Constatation principale | Score |
|-------|------------------------|-------|
| 2. PRD | 170 FRs + 39 NFRs. PRD substantiellement complet. Flux onboarding prospect sans FRs formels mais couvert par les stories. | 9/10 |
| 3. Coverage | 98.8% couverture (159/161 in-scope). 2 gaps : FR154, FR155. | 9/10 |
| 4. UX | Technologies parfaitement alignees. Anciennes palettes a nettoyer, canaux incomplets. | 8.6/10 |
| 5. Epics | 26 violations (5C, 11M, 10m). Epic 7 exemplaire (9/10). Epic 9 problematique (3/10). | 6.5/10 |

### Overall Readiness Status

## 🟡 NEEDS WORK (corrections mineures)

**Comparaison avec le rapport v1 :**

| Critere | v1 (avant corrections) | v2 (apres 3 phases) | Evolution |
|---------|------------------------|----------------------|-----------|
| Nomenclature | 🔴 CRITIQUE — 4 systemes en conflit | ✅ RESOLU — Ponctuel/Lab/Essentiel/Agentique partout | +++ |
| FR153-168 fantomes | 🔴 CRITIQUE — 16 FRs sans stories | ✅ RESOLU — Stories 9.1, 9.5, 12.6, 12.7, 12.8 creees | +++ |
| Palette couleurs | 🔴 CRITIQUE — 3 palettes contradictoires | 🟡 PARTIEL — Minimal Futuriste choisi mais anciennes refs subsistent dans le UX | ++ |
| activity_logs | 🟠 Deplace en Phase 1 | ✅ RESOLU — Cree en Story 1.2 | +++ |
| UX (OpenVidu, Storage) | 🟠 Technologies obsoletes | ✅ RESOLU — OpenVidu, Supabase Storage, densites, Orpheus | +++ |
| Lab 199€ | 🟠 Absent | ✅ RESOLU — FR169-170 + Story 11.6 | +++ |
| Stories surdimensionnees | 🟠 3 stories trop grosses | ✅ RESOLU — 2.9, 8.9, 12.5 decoupees (+5 stories) | +++ |
| Profil MiKL | 🟡 Non documente | ✅ RESOLU — Ajoute dans strategie + PRD | +++ |
| Devis juste | 🟡 Non documente | ✅ RESOLU — Ajoute dans strategie + PRD | +++ |
| Compteurs frontmatter | 🟡 152 → obsolete | ✅ RESOLU — 170 FRs partout | +++ |

**Nouvelles constatations v2 :**

| Critere | Severite | Detail |
|---------|----------|--------|
| Dark/light mode One | 🔴 Critique | Stories 8.7 et 10.1 disent "light mode", UX et Story 1.7 disent dark mode |
| Provisioning 9.1 vs 12.6 | 🔴 Critique | Duplication du processus, dependance circulaire |
| Story 9.1 AC irrealiste | 🔴 Critique | "< 2 secondes" pour un provisioning de ~5 minutes |
| FR154 + FR155 non couverts | 🟠 Majeur | 2 FRs dans les headers mais aucune story ne les implemente |
| Elio 6.x → 8.1 refactoring | 🟠 Majeur | L'architecture unifiee devrait preceder l'implementation Lab |
| Story 9.5 trop grosse | 🟠 Majeur | Export RGPD + transfert + anonymisation = 3+ stories |
| Forward dep 2.4 → 6.1 | 🟠 Majeur | Story 2.4 reference une table creee en Story 6.1 |

### Critical Issues Requiring Immediate Action

**Avant de lancer l'implementation, corriger ces 5 problemes :**

1. **Trancher dark mode vs light mode pour One** — Les specs UX disent dark mode universel (fond #020402), les Stories 8.7 et 10.1 disent "light mode". Corriger les stories pour aligner sur le dark mode ou documenter l'exception.

2. **Unifier le provisioning (9.1 vs 12.6)** — Story 12.6 doit etre la source de verite unique pour le provisioning. Story 9.1 doit referencer 12.6, pas re-decrire le processus. Definir la migration `client_instances` une seule fois.

3. **Corriger l'AC irrealiste de Story 9.1** — Remplacer "repond en moins de 2 secondes" par un declenchement asynchrone avec notification de completion (le provisioning prend ~5 minutes).

4. **Assigner FR154 et FR155 a des stories** — FR155 (API Hub↔One + HMAC) a Story 12.6. FR154 (propriete client) a Story 9.5 ou Story 10.1 comme acceptance criteria.

5. **Renumeroter Story 11.6 en 11.5** — Corriger le gap de numerotation.

### Recommended Next Steps

#### Phase A — Corrections rapides (30 min)
1. Corriger dark/light mode dans Stories 8.7 et 10.1 → dark mode
2. Corriger AC Story 9.1 "< 2s" → declenchement asynchrone
3. Renumeroter Story 11.6 → 11.5
4. Ajouter FR155 dans le resume Epic 12 (Story 12.6)
5. Ajouter FR154 comme AC dans Story 9.5 (export = propriete client)

#### Phase B — Refactoring structurel (1h)
6. Unifier provisioning : Story 9.1 Phase A doit reference "le processus de provisioning defini en Story 12.6", supprimer la re-description
7. Deplacer Story 8.1 (architecture Elio unifiee) avant Story 6.4 ou en faire un prerequis explicite
8. Decouper Story 9.5 en 3 sub-stories (export RGPD, transfert instance, retention/anonymisation)
9. Nettoyer le tableau initial du UX (anciennes couleurs → Minimal Futuriste)

#### Phase C — Ameliorations de qualite (optionnel, en cours d'implementation)
10. Corriger perspective Story 8.4 ("agent IA" → utilisateur humain)
11. Separer Story 2.10 en deux stories (alertes inactivite / import CSV)
12. Documenter la forward dependency 2.4 → 6.1 (table `parcours_templates`)
13. Harmoniser la numerotation des migrations DB
14. Marquer Story 12.5b comme "Technical Enabler"

### Final Note

Cette re-evaluation (v2) a identifie **5 problemes critiques**, **11 problemes majeurs** et **10 problemes mineurs**, principalement au niveau de la qualite des stories (Etape 5).

**Le delta par rapport au rapport v1 est tres positif :**
- Les 3 problemes critiques du v1 (nomenclature, FR153-168, palette) sont **entierement resolus**
- Les 6 problemes majeurs du v1 sont **entierement resolus**
- Les 3 lacunes strategiques du v1 sont **entierement resolues**
- Les nouveaux problemes identifies en v2 sont de nature **structurelle** (sequencage des stories, contradictions locales) et non plus **fondamentale** (architecture erronee)

**Un agent developpeur peut desormais implementer monprojetpro-dash sans construire une architecture fondamentalement incorrecte.** Les corrections restantes sont des ajustements de planning et de coherence locale, pas des erreurs de vision.

La base est solide : **170 FRs, 39 NFRs, 12 Epics, 85 Stories, 98.8% de couverture FR, technologies alignees, nomenclature coherente.**

**Evaluateur :** Claude (workflow check-implementation-readiness v2)
**Date :** 2026-02-08


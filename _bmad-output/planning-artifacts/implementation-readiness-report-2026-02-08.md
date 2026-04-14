---
stepsCompleted:
  - step-01-document-discovery
  - step-02-prd-analysis
  - step-03-epic-coverage-validation
  - step-04-ux-alignment
  - step-05-epic-quality-review
  - step-06-final-assessment
files:
  prd:
    type: sharded
    path: planning-artifacts/prd/
    index: planning-artifacts/prd/index.md
    files_count: 25
  architecture:
    type: sharded
    path: planning-artifacts/architecture/
    index: planning-artifacts/architecture/index.md
    files_count: 8
    note: "Fichier entier architecture.md supprimé (obsolète du 6 fév)"
  epics:
    type: whole
    path: planning-artifacts/epics.md
  ux:
    type: whole
    path: planning-artifacts/ux-design-specification.md
  strategie:
    type: whole
    path: planning-artifacts/monprojetpro-identite-strategie-retour.md
    note: "Version à jour du 8 fév. Ancienne version: monprojetpro-identite-strategie.md"
  modules_commerciaux:
    type: whole
    path: planning-artifacts/monprojetpro-modules-commerciaux.md
---

# Rapport d'Évaluation de Préparation à l'Implémentation

**Date :** 2026-02-08
**Projet :** monprojetpro-dash

---

## Étape 1 — Inventaire des Documents

### Documents identifiés

| Type | Format | Fichier(s) | Statut |
|---|---|---|---|
| **PRD** | Shardé | `prd/` (25 fichiers + index) | OK |
| **Architecture** | Shardé | `architecture/` (8 fichiers + index) | OK (entier supprimé) |
| **Epics & Stories** | Entier | `epics.md` | OK |
| **UX Design** | Entier | `ux-design-specification.md` | OK |
| **Stratégie/Identité** | Entier | `monprojetpro-identite-strategie-retour.md` (8 fév) | OK |
| **Modules Commerciaux** | Entier | `monprojetpro-modules-commerciaux.md` | OK |

### Problèmes résolus

- **Doublon Architecture** : `architecture.md` (6 fév) supprimé. Version shardée `architecture/` (8 fév) conservée comme référence.

### Lacunes identifiées dans le document de stratégie

| Lacune | Détail | Impact |
|---|---|---|
| **Profil MiKL incomplet** | MiKL est un développeur full-stack / product builder. Il développe réellement les produits (pas du no-code). Ce n'est pas mentionné dans la stratégie. | Affecte le positionnement commercial et la crédibilité technique |
| **Automatisation de process** | Compétence clé de l'offre (automatisation de process métier) non documentée | Affecte la proposition de valeur |
| **Notion de "devis juste"** | Le pricing setup (TJM) n'explique pas que le devis est calculé après une analyse précise du projet — ce n'est pas un prix forfaitaire générique. C'est un prix juste, argumenté et transparent. | Affecte la confiance client et la différenciation commerciale |

---

## Étape 2 — Analyse du PRD

### Exigences Fonctionnelles (FRs) extraites

**Total : 168 FRs** couvrant l'ensemble de l'écosystème MonprojetPro.

| Catégorie | FRs | Nombre |
|---|---|---|
| Hub — Gestion Clients | FR1-FR7 | 7 |
| Hub — Validation Hub | FR8-FR14 | 7 |
| Orpheus (Cursor/BMAD) | FR15-FR20d | 9 |
| Hub — Élio Hub | FR21-FR25 | 5 |
| Lab — Parcours Création | FR26-FR31 | 6 |
| Lab — Élio Lab | FR32-FR37 | 6 |
| One — Structure Dashboard | FR38-FR43 | 6 |
| One — Élio One | FR44-FR51 | 8 |
| Commun — Auth & Sécurité | FR52-FR56 | 5 |
| Commun — Communication | FR57-FR61 | 5 |
| Commun — Documents | FR62-FR65 | 4 |
| Commun — Profil Communication | FR66-FR69 | 4 |
| Onboarding & Parcours | FR70-FR73 | 4 |
| Graduation Lab→One | FR74-FR76 | 3 |
| Gestion MiKL Avancée | FR77-FR81 | 5 |
| Gestion Erreurs & Edge Cases | FR82-FR85 | 4 |
| Synchronisation & Technique | FR86-FR87 | 2 |
| Parcours Alternatifs & Cycle de Vie | FR88-FR93 | 6 |
| Facturation & Abonnements | FR94-FR98 | 5 |
| Notifications & Préférences | FR99-FR101 | 3 |
| Administration & Monitoring | FR102-FR105 | 4 |
| Recherche & Navigation | FR106-FR108 | 3 |
| Support & Feedback | FR109-FR111 | 3 |
| Multi-Device & Sessions | FR112-FR114 | 3 |
| Préparation Intégrations | FR115-FR116 | 2 |
| Accessibilité & Responsive | FR117-FR119 | 3 |
| Analytics & Métriques | FR120-FR121 | 2 |
| Expérience Élio Détaillée | FR122-FR126 | 5 |
| Temps Réel & Synchronisation | FR127-FR129 | 3 |
| Workflow MiKL Quotidien | FR130-FR133 | 4 |
| Feedback & UX | FR134-FR136 | 3 |
| Templates & Personnalisation | FR137-FR139 | 3 |
| Légal & Consentements | FR140-FR143 | 4 |
| Gestion des Fichiers | FR144-FR146 | 3 |
| État Système & Monitoring | FR147-FR148 | 2 |
| Import/Export Avancé | FR149-FR150 | 2 |
| Robustesse Technique | FR151-FR152 | 2 |
| Propriété Client & Instance Dédiée | FR153-FR157 | 5 |
| Documentation comme Livrable | FR158-FR161 | 4 |
| Surveillance Usage & Upgrade | FR162-FR165 | 4 |
| Graduation Instance Dédiée | FR166-FR167 | 2 |
| Lab — Propriété MonprojetPro | FR168 | 1 |

### Exigences Non-Fonctionnelles (NFRs) extraites

**Total : 39 NFRs**

| Catégorie | NFRs | Nombre |
|---|---|---|
| Performance | NFR-P1 à NFR-P6 | 6 |
| Sécurité | NFR-S1 à NFR-S9 | 9 |
| Scalabilité | NFR-SC1 à NFR-SC4 | 4 |
| Accessibilité | NFR-A1 à NFR-A4 | 4 |
| Intégrations | NFR-I1 à NFR-I5 | 5 |
| Fiabilité & Disponibilité | NFR-R1 à NFR-R6 | 6 |
| Maintenabilité & Qualité Code | NFR-M1 à NFR-M5 | 5 |

### Exigences additionnelles identifiées (hors FR/NFR numérotés)

| Source | Exigence | Type |
|---|---|---|
| **project-scoping** | Tests unitaires exhaustifs pour chaque FR | Contrainte dev |
| **project-scoping** | Nettoyage/refactoring obligatoire après chaque développement | Contrainte dev |
| **project-scoping** | Aucune FR "terminée" sans tests + nettoyage validés | Contrainte qualité |
| **cas-client-reference** | Modules spécifiques association : Site public, CRM, Formations/Qualiopi, Événements, Adhésions | Exigences métier MVP |
| **architecture-flux-onboarding** | Flux complet onboarding : Cal.com → Salle attente → OpenVidu → Post-visio → Création compte | Exigence process |
| **saas-b2b** | Dashboard client unifié (Lab+One conditionnels) plutôt que 2 apps séparées | Décision architecturale |
| **saas-b2b** | Messages teasing entre zones Lab/One | Exigence UX |
| **parcours-flexibles** | 4 types de parcours : Complet, Partiel, Ponctuel, Direct One | Exigence business |

### Évaluation de complétude du PRD

| Aspect | Évaluation | Note |
|---|---|---|
| Couverture fonctionnelle | Excellent — 168 FRs couvrent Hub, Lab, One, Commun | 9/10 |
| Couverture non-fonctionnelle | Bon — 39 NFRs bien détaillées | 8/10 |
| User Journeys | Excellent — 4 journeys couvrant happy path, validation, création et edge case | 9/10 |
| Modèle de données | Bon — prospects et email_templates définis, tables principales esquissées | 7/10 |
| Stack technique | Bon — clairement défini | 8/10 |
| Phasing MVP | Excellent — priorisation claire P1/P2/P3 | 9/10 |

### Incohérences PRD détectées

| Incohérence | Détail |
|---|---|
| **Naming Élio One** | Le PRD utilise "Basic/Premium" (FR, SaaS B2B) mais la stratégie mise à jour utilise "Élio One / Élio One+". Le PRD n'a pas été mis à jour avec les nouveaux noms. |
| **Naming offres** | Le PRD utilise "Pro (59€) / Business (99€)" mais la stratégie utilise "Essentiel (49€) / Agentique (99€)". Prix et noms divergent. |
| **Lab 199€** | L'offre Lab à 199€ est dans la stratégie mais pas reflétée dans le PRD (FR facturation/abonnements). |
| **Propriété client** | FR153-FR168 ajoutés le 08/02 sont cohérents avec la stratégie, mais le modèle multi-tenant du PRD SaaS B2B (section "base unique RLS") contredit l'instance dédiée par client One. |
| **Next.js version** | Le cas client référence mentionne "Next.js 14+" alors que la stratégie et l'architecture mentionnent "Next.js 16". |
| **MiKL non décrit comme développeur** | Le PRD mentionne "Développeur principal : MiKL (via Cursor/BMAD)" mais ne détaille pas son profil full-stack ni la notion de product builder. |

---

## Étape 3 — Validation Couverture Epics

### Statistiques de couverture

| Métrique | Valeur |
|---|---|
| Total FRs PRD | 168 |
| FRs Hors Périmètre (Orpheus) | 9 (FR15-FR20d) |
| FRs à couvrir | 159 |
| FRs couvertes dans les Epics | 159 |
| **Taux de couverture** | **100%** |
| Total Epics | 12 |
| Total Stories | 79 |

### Mapping Epics → FRs

| Epic | Titre | FRs couvertes | Nb |
|---|---|---|---|
| Epic 1 | Fondation Plateforme & Auth | FR52-56, FR73, FR82, FR108, FR112-114, FR117-119, FR134, FR140-143, FR151-153, FR155 | 23 |
| Epic 2 | CRM Hub | FR1-7, FR79-81, FR84-85, FR89-90, FR106, FR130-133, FR149 | 20 |
| Epic 3 | Communication & Notifications | FR57, FR61, FR99-101, FR109-111, FR127-129 | 11 |
| Epic 4 | Gestion Documentaire | FR62-65, FR86, FR107, FR135-136, FR144-146, FR150, FR159 | 13 |
| Epic 5 | Visioconférence & Onboarding | FR58-60, FR70-72 | 6 |
| Epic 6 | Parcours Lab | FR26-37 | 12 |
| Epic 7 | Validation Hub | FR8-14 | 7 |
| Epic 8 | Agents IA Élio | FR21-25, FR44-51, FR66-69, FR83, FR87, FR122-126, FR160 | 25 |
| Epic 9 | Graduation & Cycle de Vie | FR74-76, FR88, FR91-93, FR157, FR161, FR166-168 | 12 |
| Epic 10 | Dashboard One & Modules | FR38-43, FR139, FR154 | 8 |
| Epic 11 | Facturation & Abonnements | FR77-78, FR94-98 | 7 |
| Epic 12 | Administration, Analytics & Monitoring | FR102-105, FR115-116, FR120-121, FR137-138, FR147-148, FR156, FR158, FR162-165 | 18 |

### FRs manquantes : AUCUNE

Toutes les 159 FRs applicatives sont couvertes dans au moins un epic.

### Problèmes identifiés dans les Epics

| Problème | Sévérité | Détail |
|---|---|---|
| **Compteur frontmatter obsolète** | Faible | Le frontmatter des epics indique "152 FRs" mais les FR153-168 ont été ajoutées sans mettre à jour le compteur (devrait être 159 FRs in-scope) |
| **Naming incohérent Élio** | Élevé | Les Epics utilisent "Basic/Premium" pour Élio One au lieu de "One/One+" (nouvelle nomenclature stratégie) |
| **Naming incohérent offres** | Élevé | Les Epics référencent "Pro/Business" au lieu de "Essentiel/Agentique" avec prix divergents (59€ vs 49€) |
| **Stories FR153-168 non détaillées** | Modéré | Les nouveaux FRs (propriété client, instances dédiées) sont mappés via des "notes d'impact" sur des stories existantes, mais aucune story dédiée n'a été créée pour les FRs les plus structurants (FR153, FR156) |
| **Contradiction modèle multi-tenant** | Élevé | Le SaaS B2B Requirements dit "Base unique RLS" mais l'impact assessment dit "instance dédiée par client One". Les deux modèles coexistent (Lab=multi-tenant, One=dédié) mais ce n'est pas clarifié dans les stories originales |
| **Offre Lab 199€ absente** | Modéré | L'offre Lab à 199€ forfait n'est couverte par aucune FR ni story de facturation |

---

## Étape 4 — Alignement UX

### Statut du document UX

**Trouvé :** `ux-design-specification.md` — Dernière mise à jour : 30/01/2026

### Problèmes d'alignement UX ↔ Stratégie/PRD/Architecture

| Problème | Sévérité | Détail |
|---|---|---|
| **Palette couleurs contradictoire** | CRITIQUE | La stratégie définit : Hub=Bordeaux (#6B1B1B), Lab=Vert émeraude (#2E8B57), One=Orange (#F7931E). Le UX définit un style "Minimal Futuriste" dark mode avec : Hub=Cyan/Turquoise, Lab=Violet/Purple, One=Vert émeraude ou Orange. **Les couleurs sont complètement différentes.** |
| **Outil visio contradictoire** | Élevé | Le UX mentionne "Daily.co/Whereby" pour la visio (Core Communication Kit) alors que le PRD et l'architecture ont décidé **OpenVidu** (self-hosted). La section onboarding du UX utilise correctement OpenVidu → incohérence interne. |
| **Stockage contradictoire** | Élevé | Le UX mentionne "Google Drive Workspace" pour le stockage fichiers, alors que le PRD et l'architecture utilisent **Supabase Storage** (V1) et **MinIO** (V2+). Google Drive n'apparaît nulle part ailleurs. |
| **Naming "MonprojetPro-Outil" résiduel** | Modéré | Le UX utilise encore "MonprojetPro-Outil" dans plusieurs endroits (parcours utilisateurs, tableau d'actions core) au lieu de "MonprojetPro-One". |
| **Orpheus placé dans le Hub** | Modéré | Le tableau "Architecture Agents IA" du UX (ligne 491) met "Orpheus | Hub | Assistant MiKL unique" alors qu'Orpheus est dans **Cursor/BMAD**, PAS dans le Hub. Corrigé dans une note mais le tableau est toujours faux. |
| **Template Lite/Pro** | Faible | Le parcours direct (ligne 212) mentionne "Sélection template (Lite/Pro)" — nomenclature non définie ailleurs. |
| **Densité non spécifiée** | Faible | La stratégie définit 3 densités (Hub=Compact, Lab=Spacieux, One=Confortable) mais le UX ne les mentionne pas. |
| **Date obsolète** | Modéré | Le UX date du 30/01/2026 — antérieur aux changements architecturaux majeurs du 08/02 (propriété client, instances dédiées, nouvelle nomenclature offres). |

### Alignement UX ↔ PRD : ce qui fonctionne

| Aspect | Alignement |
|---|---|
| Architecture 3 dashboards (Hub/Lab/One) | OK |
| Parcours Lab → Graduation → One | OK |
| Validation Hub workflow | OK |
| Élio comme assistant contextuel | OK |
| Chat Élio + Chat MiKL (2 canaux distincts) | OK |
| Onboarding prospect (Cal.com → Salle attente → Visio → Post-visio) | OK |
| Desktop first + Responsive | OK |
| Typographie (Poppins + Inter) | OK |

### Recommandation

Le document UX nécessite une **mise à jour significative** pour s'aligner avec :
1. La nouvelle palette couleurs de la stratégie (Bordeaux/Vert/Orange) OU clarifier que le "Minimal Futuriste" dark mode remplace les couleurs de la stratégie
2. Les décisions techniques finales (OpenVidu, Supabase Storage, pas Google Drive)
3. La nomenclature à jour (One/One+, Essentiel/Agentique, plus de "MonprojetPro-Outil")
4. Le modèle propriété client + instances dédiées

---

## Étape 5 — Revue Qualité des Epics

### Score global : 6.5 / 10

| Critère | Score | Notes |
|---|---|---|
| Valeur utilisateur | 7/10 | La majorité des stories sont user-centric ; 5 stories "développeur" tirent le score vers le bas |
| Indépendance des Epics | 7/10 | Pas de dépendance forward, mais couplage E6→E7 et E8 refactorisant E6 |
| Qualité des Stories | 8/10 | Excellent Given/When/Then, critères d'acceptation clairs et détaillés |
| Gestion des dépendances | 6/10 | Table activity_logs utilisée avant d'être créée ; couplage cross-epic validation_requests |
| Couverture FR réelle | 4/10 | 16 FRs instance-per-client (FR153-168) sont mappées mais JAMAIS implémentées dans les stories |
| Cohérence des noms | 3/10 | 3 nomenclatures d'offres coexistent ; Basic/Premium vs One/One+ non résolu |
| Taille des stories | 7/10 | Majorité bien dimensionnée ; 3-4 stories surdimensionnées à découper |
| Rigueur technique | 9/10 | Détail exceptionnel sur les schémas DB, RLS, server actions, patterns |

### Violations critiques (🔴)

#### CRITIQUE-01 : FR153-168 (instance-per-client) fantômes

Les 16 nouveaux FRs du modèle propriété client sont mappés dans la couverture et mentionnés dans les headers d'epics, mais **aucune story détaillée ne les implémente réellement** :
- Epic 1 header dit FR153, FR155 → aucune story ne mentionne le déploiement d'instance ou la communication Hub↔One via HMAC
- Epic 9 header dit FR157, FR161, FR166-168 → Story 9.1 décrit toujours la graduation comme un update dans un Supabase partagé, PAS le provisioning d'une instance dédiée
- Epic 12 header dit FR156, FR158-165 → aucune story pour le provisioning, monitoring d'instances, vérification documentation

**Impact : Un développeur suivant ces stories construirait la MAUVAISE architecture pour MonprojetPro One.**

#### CRITIQUE-02 : 5 stories écrites pour un agent développeur, pas un utilisateur

Stories 1.1, 1.2, 1.10, 8.1, 11.1 utilisent "As a **développeur (agent IA)**" — ce sont des tâches techniques sans valeur utilisateur directe.

### Problèmes majeurs (🟠)

| Problème | Détail |
|---|---|
| **Naming incohérent** | 3 nomenclatures coexistent : Basic/Premium (FRs, stories 8.7-8.9), One/One+ (stratégie), Ponctuel/Essentiel/Agentique (story 9.4). Le même document utilise les 3. |
| **Epic 8 surdimensionné** | 9 stories, 24 FRs, consolide les 3 variants Élio. Refactorise du code créé en Epic 6 (entanglement). |
| **Dépendance E6→E7** | Epic 6 crée la table validation_requests (migration 00010) consommée par Epic 7. E7 ne peut pas démarrer sans E6 partiel. |
| **Table activity_logs** | Migration 00012 documentée en Epic 12, mais référencée dès les stories 2.3, 2.9, 2.10, 5.4. La table est utilisée avant d'être créée. |

### Préoccupations mineures (🟡)

| Préoccupation | Détail |
|---|---|
| Stories surdimensionnées | Stories 2.9 (cycle de vie), 8.9 (Élio Premium), 12.5 (monitoring) combinent trop de fonctionnalités et devraient être découpées |
| Critères trop prescriptifs | Les stories dictent des chemins de fichiers, noms de composants, queryKeys TanStack — couplage fort à l'implémentation |
| Story 4.6 cross-cutting | Autosave/Undo placé dans Epic 4 (Documents) mais affecte tous les formulaires de la plateforme |
| Palette couleurs incohérente | Story 8.5 dit Hub="bleu nuit + cuivre" mais Epic 1 dit Hub="Cyan/Turquoise" |

### Actions recommandées avant implémentation

1. **🔴 URGENT** : Créer ou mettre à jour les stories pour FR153-168 — soit nouvelles stories dans Epics 9, 10, 12, soit révision significative des stories 9.1, 9.2, 9.5, 12.1, 12.4, 12.5 pour refléter le modèle instance-per-client
2. **🔴 URGENT** : Résoudre la nomenclature des offres — choisir Ponctuel/Essentiel/Agentique et mettre à jour tous les FRs et stories
3. **🟠 IMPORTANT** : Déplacer la migration activity_logs de Epic 12 vers Epic 1 ou 2
4. **🟠 IMPORTANT** : Découper les stories 2.9, 8.9 et 12.5 en unités plus petites
5. **🟡** : Reformuler les 5 stories développeur en perspective utilisateur ou les labéliser "Technical Enabler"

---

## Étape 6 — Évaluation Finale et Recommandations

### Statut Global de Préparation

## ⚠️ NEEDS WORK — Corrections nécessaires avant implémentation

La plateforme MonprojetPro dispose d'une base documentaire **solide** (168 FRs, 39 NFRs, 12 Epics, 79 Stories) mais l'évolution architecturale du 8 février (modèle instance-per-client, propriété client, nouvelle nomenclature) a créé un **désalignement significatif** entre les documents. Un développeur ou agent IA suivant ces documents en l'état construirait une architecture incorrecte pour MonprojetPro One.

### Synthèse des Constatations

| Étape | Score | Statut |
|---|---|---|
| 1 — Inventaire Documents | — | ✅ Complet, doublon résolu |
| 2 — Analyse PRD | 8/10 | ⚠️ 6 incohérences, naming obsolète |
| 3 — Couverture Epics | 100% mapping | ⚠️ Couverture en-têtes ≠ couverture réelle |
| 4 — Alignement UX | — | 🔴 8 problèmes dont 1 critique |
| 5 — Qualité Epics | 6.5/10 | 🔴 2 critiques, 4 majeurs |

### Problèmes Critiques Nécessitant une Action Immédiate

| # | Problème | Documents affectés | Impact si non corrigé |
|---|---|---|---|
| **C1** | **FR153-168 fantômes** : 16 FRs instance-per-client sont mappées dans les en-têtes mais AUCUNE story ne les implémente. Le modèle de graduation (Story 9.1) décrit toujours un Supabase partagé, pas un provisioning d'instance dédiée. | Epics | Un agent développeur construirait un système multi-tenant là où il faut des instances dédiées. Architecture fondamentalement erronée pour MonprojetPro One. |
| **C2** | **3 nomenclatures coexistent** : Basic/Premium (PRD, Epics), One/One+ (Stratégie), et Ponctuel/Essentiel/Agentique (Story 9.4). Offres Pro(59€)/Business(99€) vs Essentiel(49€)/Agentique(99€). | PRD, Epics, Stratégie | Confusion totale lors de l'implémentation. Noms et prix incorrects dans l'interface, la facturation, les emails. |
| **C3** | **Palette couleurs contradictoire** : Stratégie = Bordeaux/Vert/Orange. UX = Cyan/Turquoise/Violet en dark mode "Minimal Futuriste". Aucun document ne fait autorité. | Stratégie, UX | L'interface visuelle sera construite avec les mauvaises couleurs. Incohérence entre dashboards Hub/Lab/One. |

### Problèmes Majeurs à Résoudre

| # | Problème | Action requise |
|---|---|---|
| **M1** | UX document périmé (30/01) — antérieur aux changements du 08/02 | Mise à jour UX avec : nouvelles couleurs, OpenVidu (pas Daily.co), Supabase Storage (pas Google Drive), nomenclature à jour, modèle instance-per-client |
| **M2** | Table `activity_logs` utilisée en Epics 2, 5 avant d'être créée en Epic 12 | Déplacer la migration 00012 (activity_logs) vers Epic 1 ou 2 |
| **M3** | Lab 199€ forfait absent du PRD et des stories de facturation | Ajouter FR dédiée dans le PRD et story dans Epic 11 (Facturation) |
| **M4** | Epic 8 surdimensionné (9 stories, 24 FRs, 3 variants Élio) | Découper ou documenter clairement les sous-phases |
| **M5** | 5 stories écrites pour "développeur (agent IA)" au lieu d'un utilisateur | Reformuler en valeur utilisateur ou labéliser "Technical Enabler" |
| **M6** | Contradiction multi-tenant ↔ instance dédiée non résolue dans les stories | Clarifier explicitement : Lab = multi-tenant RLS, One = instance dédiée Vercel+Supabase |

### Lacunes Stratégiques Non Documentées

| Lacune | Impact |
|---|---|
| **Profil MiKL** : MiKL est un développeur full-stack / product builder qui construit réellement les produits. Ce n'est pas du no-code. Non reflété dans PRD ni stratégie. | Positionnement commercial et crédibilité technique auprès des clients |
| **Automatisation de process** : Compétence clé de l'offre non documentée dans aucun artefact | Proposition de valeur incomplète — les clients ne savent pas que MonprojetPro peut automatiser leurs process métier |
| **Devis juste** : Le pricing n'est pas un forfait générique mais un devis calculé après analyse précise du projet. Concept absent des documents. | Différenciation commerciale et confiance client — le "juste prix" est un argument de vente majeur |

### Plan d'Action Recommandé (par priorité)

#### Phase 1 — Corrections bloquantes (avant Epic 1)

1. **Résoudre la nomenclature** : Choisir définitivement les noms (One/One+, Essentiel/Agentique) et mettre à jour TOUS les documents (PRD, Epics, UX, Stratégie). Utiliser un search-and-replace systématique.
2. **Créer les stories FR153-168** : Écrire 3-5 stories dédiées au modèle instance-per-client dans les Epics 9, 10 et 12. Minimum :
   - Story provisioning instance (Vercel + Supabase) dans Epic 9
   - Story monitoring multi-instances dans Epic 12
   - Story propriété et documentation client dans Epic 12
   - Réviser Story 9.1 pour refléter la graduation vers instance dédiée (pas update dans Supabase partagé)
3. **Résoudre la palette couleurs** : Décider si la stratégie (Bordeaux/Vert/Orange) ou le UX (Minimal Futuriste dark mode) fait autorité. Mettre à jour le document perdant.
4. **Déplacer `activity_logs`** : Migration 00012 → Epic 1 ou Epic 2.

#### Phase 2 — Mises à jour importantes (avant Epic 5-6)

5. **Mettre à jour le document UX** : OpenVidu, Supabase Storage, nomenclature, densités, suppression de "MonprojetPro-Outil" et "Google Drive".
6. **Ajouter le Lab 199€** : FR dans le PRD + Story dans Epic 11.
7. **Découper les stories surdimensionnées** : Stories 2.9, 8.9, 12.5.
8. **Reformuler les 5 stories développeur** en valeur utilisateur.

#### Phase 3 — Enrichissement (peut être fait en parallèle)

9. **Documenter le profil MiKL** dans la stratégie et le PRD.
10. **Documenter l'automatisation de process** comme compétence clé.
11. **Documenter le concept "devis juste"** dans la stratégie et le parcours onboarding.
12. **Mettre à jour le compteur frontmatter** des epics (152 → 159 FRs in-scope).

### Note Finale

Cette évaluation a identifié **3 problèmes critiques**, **6 problèmes majeurs** et **3 lacunes stratégiques** répartis sur 5 catégories de documents (PRD, Architecture, Epics, UX, Stratégie).

La base est solide : le PRD est détaillé (168 FRs), l'architecture shardée est à jour, les stories ont un excellent niveau de détail technique (Given/When/Then, schémas DB, RLS). Le problème principal est le **décalage temporel** — l'évolution architecturale du 8 février (instance-per-client, propriété client, nouvelle nomenclature) n'a pas encore été propagée dans tous les documents.

Les corrections de la Phase 1 sont **bloquantes** — sans elles, un agent développeur construirait une architecture fondamentalement incorrecte pour MonprojetPro One. Les Phases 2 et 3 peuvent être faites progressivement pendant l'implémentation.

**Évaluateur :** Claude (workflow check-implementation-readiness)
**Date :** 2026-02-08


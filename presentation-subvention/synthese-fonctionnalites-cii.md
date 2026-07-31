# MonprojetPro — Synthèse exhaustive des fonctionnalités des 3 dashboards
## Dossier d'agrément CII (Crédit d'Impôt Innovation) — angle innovation

> Document de synthèse produit à partir de l'inventaire du code source réel de la plateforme.
> Distingue systématiquement ce qui est **construit et opérationnel** de ce qui est **planifié**.
> Date : 2026-07-02.

---

## 0. Positionnement innovant — en une page

**MonprojetPro** est une plateforme SaaS B2B modulaire d'accompagnement entrepreneurial fondée sur le **modèle « Centaure » (IA + Humain)** : un agent IA (Élio) assume une posture de coach et force de proposition, sous supervision humaine intégrée à des points de contrôle précis (validations, injections de contexte, escalades).

La plateforme se distingue de l'état de l'art (outils SaaS incubation / CRM / no-code classiques) par **cinq partis-pris techniques innovants** :

1. **Un cycle de vie client unifié Lab → One sans provisioning** : l'accompagnement (Lab) et l'outil métier livré (One) coexistent dans **un seul déploiement multi-tenant**, la « graduation » étant un simple changement d'état — là où l'état de l'art impose une instance/infrastructure dédiée par client.
2. **Une architecture modulaire plug & play à découverte automatique** : chaque brique fonctionnelle est un module autodéclaré, chargé dynamiquement, sans liste codée en dur ni couplage inter-modules.
3. **Un noyau IA « Centaure » à continuité de contexte** : le profil de communication et les acquis de la phase Lab sont hérités par l'IA de la phase One, sans migration de données.
4. **Une architecture temps réel multi-consumers coordonnée** : un orchestrateur unique de rafraîchissement résout les désynchronisations entre lecteurs hétérogènes d'une même donnée.
5. **Un « kit de sortie » à tree-shaking sur commande** : capacité d'extraire un client vers un déploiement autonome et RGPD-propre (conçu, partiellement amorcé — cf. §7).

Ces choix constituent le cœur de la **démarche d'innovation** valorisable au titre du CII : ils dépassent les fonctionnalités et l'ergonomie des produits concurrents du marché.

---

## 1. Vue d'ensemble — les 3 dashboards

| Dashboard | Utilisateur | Rôle | Thème | Modèle de déploiement |
|-----------|-------------|------|-------|-----------------------|
| **Hub** | MiKL (opérateur) | Cockpit de pilotage de toute l'activité | Cyan/turquoise, dense | Instance unique |
| **Lab** | Client en incubation | Parcours d'accompagnement entrepreneurial guidé par l'IA | Violet, spacieux | Multi-tenant (RLS) |
| **One** | Client « gradué » | Outil métier sur-mesure + console de pilotage des livrables | Vert, confortable | Multi-tenant (RLS) |

**Innovation structurante** : Lab et One ne sont pas deux produits ni deux déploiements, mais **deux modes d'une même application multi-tenant**. Un client bascule de l'un à l'autre par un simple toggle, sans rechargement ni provisioning.

---

## 2. Dashboard HUB — pilotage opérateur (construit)

### 2.1 Sécurité & authentification (verrou technique)
- **Authentification anti-brute-force** : rate-limiting par fonctions Postgres `SECURITY DEFINER` (`fn_check_login_attempts`, `fn_record_login_attempt`), traçage IP.
- **2FA/MFA TOTP natif (niveau AAL2)** : enrôlement QR + secret manuel, 10 codes de récupération à usage unique stockés en SHA-256, challenge/verify enchaînés pour tenir la fenêtre de 30 s.
- **Keep-alive de session serveur** : ping silencieux toutes les 4 min rafraîchissant le JWT côté serveur uniquement (choix délibéré pour éviter la révocation de refresh token en présence de multiples clients Realtime).

### 2.2 CRM 360° (construit)
- Base clients complète : liste, création, édition, **recherche temps réel** (debounce 300 ms **sur le cache**, zéro requête DB supplémentaire).
- **Fiches client à onglets modulaires** : Pilote, Emails (Gmail OAuth), Support, Soumissions, Élio, Branding, Lab, Paramètres.
- **Cycle de vie complet** : suspension, clôture à double validation, réactivation, upgrade Ponctuel → Lab / One.
- **Import CSV** jusqu'à 500 clients (prévisualisation + validation).
- Statistiques : KPIs, répartition par type, **taux de graduation Lab→One**, temps estimé par client.
- **Impersonation** client (support) et **export RGPD** (ZIP, double autorisation client/opérateur).
- Alertes d'inactivité automatiques (Edge Function quotidienne).

### 2.3 Validation Hub (construit — innovation de workflow)
- **File d'attente unifiée** de toutes les productions à valider : soumissions d'étapes Lab, briefs Lab, demandes d'évolution One.
- Actions 1-clic : approuver / commenter / refuser / demander clarification.
- **Badge sidebar temps réel** (Supabase Realtime sur `validation_requests`).
- C'est le **point de contrôle humain** du modèle Centaure.

### 2.4 Agenda multi-sources (verrou technique)
Agrégateur unifiant **5 sources hétérogènes** dans un seul calendrier filtrable :
1. Événements internes MonprojetPro
2. Événements personnels
3. **Google Calendar** (OAuth2 multi-comptes, refresh token automatique, CRUD complet)
4. **Cal.com** (bookings via webhook)
5. **Flux iCal** publics (parsing natif `.ics` / `webcal://`)

Vues Jour/Semaine/Mois, auto-refresh 5 min + au retour d'onglet.

### 2.5 Communication client
- **Chat temps réel** MiKL ↔ client (optimistic updates, marquage lu auto, indicateur de frappe, badge non-lus Realtime).
- **Emails via Gmail** (OAuth) directement depuis la fiche CRM, avec **reformulation Élio** avant envoi.
- **Notifications** : cloche header temps réel, centre de notifications, préférences par catégorie.

### 2.6 Visio (construit)
- Création de meetings **Google Meet API v2** (lien auto, Service Account + délégation de domaine).
- **Récupération automatique post-meeting** des enregistrements (Google Drive) et **transcriptions Gemini** (Google Docs).

### 2.7 Documents (construit)
- Upload drag & drop (9 types, 10 Mo), validation triple couche (RLS + serveur + client).
- Visualisation inline (Markdown→HTML, PDF, images), **génération PDF brandé** depuis Markdown.
- Organisation en dossiers, partage opérateur→client, Signed URLs Supabase (1 h), export ZIP.

### 2.8 Facturation (construit)
- Devis → factures (conversion 1 clic), abonnements récurrents, **MRR / CA / taux de recouvrement**.
- **Synchronisation bidirectionnelle Pennylane** (Edge Function 5 min + webhook `paid` entrant).
- **Activation client automatique par webhook** : paiement → vérification HMAC → matching devis → activation compte → email de bienvenue (Resend), sans intervention manuelle.

### 2.9 Administration système (construit + phase 2)
- **Provisioning d'instances One** : appel réel Supabase Management API + Vercel (migrations, health check, suivi d'étapes temps réel).
- Monitoring (CPU/mémoire/uptime), logs d'audit, mode maintenance, transfert d'instance.
- **Catalogue de modules** : sync depuis manifests, activation/désactivation par client.
- *Phase 2 (placeholders)* : Webhooks sortants, API clients, Backups.

### 2.10 Analytics (construit)
- Calculé intégralement depuis `activity_logs` (append-only, pas de table analytique séparée) : usage des modules, métriques Élio (conversations, feedbacks, coût tokens), clients actifs/inactifs, MRR.

### 2.11 Cockpit produit MenuFacile (construit — innovation d'isolation)
- Pilotage d'un produit externe (application de recettes) **sans jamais accéder à sa base** : tout transite par un **guichet HTTP `admin-api` sécurisé** (Bearer token serveur). Isolation totale des deux bases Supabase.
- Cockpit : KPIs, **graphiques d'évolution temporelle** (nouveaux comptes/jour, DAU, copies), modération, recettes officielles, messagerie support 2 sens.

### 2.12 Élio Hub (construit)
- Assistante IA de l'opérateur avec accès au contexte de tous les clients, connaissance des features et schémas DB du Hub.
- **4 modes** : Ordre (action) · Avis · Màj Élio (directives) · Brouillon.
- Génération/ajustement de brouillons, correction et adaptation de texte.

---

## 3. Dashboard LAB — incubation guidée par l'IA (construit)

### 3.1 Parcours entrepreneurial structuré (cœur d'innovation)
- **Timeline verticale à progression linéaire** : chaque étape se débloque après validation de la précédente (mode « tracé ») ou navigation libre.
- **Briefs Markdown riches** par étape (galerie d'assets embarquée : images, vidéos YouTube/Vimeo via `brief_assets` JSONB).
- **Workflow soumission → validation** : le client soumet son travail, MiKL approuve / refuse / demande révision avec feedback ; notifications automatiques bidirectionnelles.
- **Injections de feedback MiKL** dans le fil de l'étape, marquables comme lus.
- Modification du parcours en cours de route (ajout/réordonnancement d'étapes), templates réutilisables (snapshot à l'assignation — les parcours en cours ne sont pas impactés).

### 3.2 Agents Élio de parcours (innovation IA)
- **11 agents experts** (Vision, Marché, Cible, Offre, Identité, Positionnement, Feuille de route, Légitimité, Business, Acquisition/contenu, Récap), chacun avec system prompt, modèle et température dédiés, **stockés en base** (`elio_lab_agents`, pas codés en dur) et synchronisés depuis des définitions Markdown.
- Chat Élio **par étape** : résolution de l'agent assigné, injection du contexte client fourni par MiKL, **transparence** (Élio annonce explicitement les consignes de MiKL).
- **Génération assistée de documents** : Élio produit un brief structuré / document final soumis directement au workflow de validation.

### 3.3 Onboarding & conformité
- Flow complet : changement de mot de passe temporaire → écran de bienvenue → tour guidé.
- **Gestion du consentement IA (RGPD)** : re-consentement automatique si la politique évolue, guard `hasIaConsent()` avant tout appel LLM.

### 3.4 Modules partagés disponibles en Lab
Chat, Documents, Visio (widget Cal.com), Support (tickets + FAQ), Suivi de l'outil, Notifications — tous branchés temps réel.

---

## 4. Dashboard ONE — outil métier livré + console de pilotage (construit)

### 4.1 Shell personnalisé par client (innovation d'ergonomie)
- **Branding client dynamique** : couleur d'accent personnalisable (`custom_branding.accentColor`), variables CSS calculées avec **contraste WCAG AA garanti**, nom/logo personnalisés.
- **Bandeau « en chantier »** animé tant que l'outil sur-mesure n'est pas livré (`one_status = 'construction'`).
- **Mode Lab en lecture seule** accessible depuis One (historique du parcours), via toggle instantané.

### 4.2 Console d'activité (construit — « cockpit des livrables »)
Grille de cartes **toutes branchées sur de vraies sources + Realtime** :
- À traiter (demandes d'évolution + tickets support)
- Suivi de l'outil (posts + dernière activité)
- Messages non lus MiKL
- Documents (livrables + dernière livraison)
- Prochain RDV visio
- Abonnement (tier)

### 4.3 Graduation Lab → One (innovation de parcours)
- Détection middleware (`graduated_at` + flag `graduation_screen_shown`) → séquence **Célébration (confettis) → Découverte One → Tour guidé**.
- **Compilation des acquis Lab** (`compile-lab-learnings`) : les observations implicites collectées pendant le Lab sont compilées dans le profil de communication au moment de la graduation.

### 4.4 Suivi de l'outil (construit)
- Fil chronologique des mises à jour de développement publiées par l'opérateur (jusqu'à 5 images, lightbox), **commentaires client**, temps réel, notifications email (Resend) togglables par module.

### 4.5 Facturation & paramètres client
- Facturation abonnement, justificatifs, config comptable (Google Drive).
- Paramètres : apparence/branding, profil de communication, consentements IA, Élio avancé, sessions, notifications.

---

## 5. Le noyau « Centaure » — Élio (transverse, construit)

### 5.1 Architecture LLM
- Provider **Claude / Anthropic** (SDK officiel), appels **serveur uniquement** (clé jamais exposée).
- **Point d'entrée unique** (`send-to-elio`) : timeout 60 s, routing par dashboard (hub/lab/one).
- **Instrumentation fine des tokens** : comptage par agent et par client, alertes de budget configurables, dashboards de coûts.

### 5.2 Posture « coach » codifiée
- Constante `ELIO_POSTURE_COACH` : faits sacrés (ne ment jamais sur les faits) + force de proposition + challenge tactique + accompagnement vers l'autonomie. **≠ chatbot FAQ**.

### 5.3 Continuité de contexte Lab → One (innovation forte)
- **Héritage sans migration** : Élio One reçoit dans son prompt les **briefs Lab validés**, les **décisions MiKL** et l'**état du parcours** — lus dans la même base multi-tenant partagée.
- **Profil de communication Orpheus** (`communication_profiles`) : 6+ dimensions (niveau technique, style, ton, longueur, tutoiement, exemples, à éviter/à privilégier), enrichi par observation implicite pendant le Lab, compilé à la graduation, injecté dans tous les prompts.

### 5.4 Ancrage anti-hallucination
- Injection systématique de l'**état réel du dashboard** dans le prompt (`getLabParcoursContext`, `getOneContext`) : modules actifs, tier, statut livraison, derniers posts, tickets.
- **Cartes de navigation** (`LAB_NAVIGATION_MAP`, `ONE_NAVIGATION_MAP`) connues d'Élio.
- **Documentation des modules actifs** injectée dynamiquement.

### 5.5 Interactions avancées
- **Escalade Élio → MiKL** : détection de patterns de faible confiance → bandeau « Contacter MiKL » → notification opérateur avec historique.
- **Deep-linking** : Élio émet des tokens `[[goto:CLE|Libellé]]` transformés en boutons cliquables (12 destinations mappées).
- **Collecte d'évolutions** : Élio One guide la formulation d'une demande d'évolution et la soumet au Validation Hub.
- **Mot proactif** : génération d'un court message contextuel sur événements déclencheurs (graduation, post de suivi, évolution approuvée, module activé…).

---

## 6. Socle technique & partis-pris innovants (cœur du dossier CII)

| # | Verrou / innovation | Nature de la difficulté dépassée | Source |
|---|---------------------|----------------------------------|--------|
| 1 | **Multi-tenancy à isolation RLS stricte sans instance dédiée** | Garantir l'étanchéité inter-clients au seul niveau base (RLS), avec tests d'isolation bloquants en CI, plutôt qu'une infra par client | ADR-01 |
| 2 | **Graduation Lab→One sans provisioning** | Faire coexister deux expériences produit (accompagnement / outil livré) dans une seule app, la bascule étant un simple flag SQL — sans downtime ni migration | ADR-01 |
| 3 | **Modularité plug & play à découverte automatique** | Registry auto-découvrant les modules par manifest, chargement `next/dynamic`, **interdiction d'import inter-module** (communication via Supabase/Realtime) | CLAUDE.md / archi §03 |
| 4 | **Continuité de contexte LLM Lab→One in-place** | Transmettre à l'IA One les acquis du Lab sans transfert de données (lecture base partagée + compilation du profil) | PRD continuité Élio |
| 5 | **Temps réel multi-consumers coordonné** | Un orchestrateur unique (`RealtimeDashboardRefresh`) abonné à 6 tables, avec **debounce 300 ms** regroupant les INSERT cascadés, résout les désynchronisations entre lecteurs SSR/polling/Realtime | Code Hub |
| 6 | **Activation client 100 % automatisée par webhook** | Pipeline autonome paiement→activation→email (HMAC, matching, dispatch typé) sans geste opérateur | Code Hub |
| 7 | **Isolation par guichet pour produit tiers (MenuFacile)** | Piloter un produit externe sans coupler les bases : proxy HTTP admin-api à secret serveur | Code + docs module |
| 8 | **Kit de sortie à tree-shaking sur commande** | Extraire un client vers un déploiement autonome RGPD-propre, bundle réduit (~40 %) via feature flags build-time | ADR-02 *(cf. §7 : conçu, partiellement amorcé)* |

**3 patterns de data-fetching stricts** (aucune exception) : Server Component (lecture) · Server Action (mutations) · API Route (webhooks). TanStack Query = source unique de vérité côté client ; Supabase Realtime invalide le cache (jamais de sync manuelle).

**Qualité industrialisée** : tests d'isolation RLS, contract tests par module, documentation obligatoire par module (guide/faq/flows, vérifiée en CI), TypeScript strict, couverture > 80 %.

---

## 7. Périmètre honnête — construit vs planifié (intégrité du dossier)

> Section volontairement transparente : un dossier d'agrément gagne en crédibilité en distinguant le réalisé du prévu.

### ✅ Construit et opérationnel
L'intégralité des §2 à §6 ci-dessus repose sur du code présent et fonctionnel (Hub complet, Lab complet, One complet, noyau Élio complet, socle multi-tenant/Realtime/modulaire).

### 🚧 Conçu / partiellement amorcé
- **Kit de sortie (export standalone client)** : architecture entièrement spécifiée (ADR-02) ; points d'entrée présents (`start-lab-exit-kit.ts`, export RGPD `export-client-data.ts`) mais **script handoff complet 8 étapes non implémenté**.
- **Registry central à imports dynamiques conditionnels** + **feature flags build-time** (`NEXT_PUBLIC_ENABLE_LAB_MODULE` / `_ENABLE_AGENTS`) + **job CI `build-standalone-check`** : spécifiés (ADR-02), non confirmés dans le code.

### 🔜 Phase 2 (placeholders explicites)
- Admin Hub : **Webhooks sortants**, **API clients**, **Backups** (placeholders assumés).
- Agents Élio **Hub (« Concierge »)** et **One (« FORGE »)** : dossiers présents mais **vides** — seuls les 11 agents **Lab** sont définis (l'Élio Hub et l'Élio One fonctionnent via leurs prompts, mais pas encore via des agents-fichiers dédiés).
- Recherche globale du header : champ UI sans moteur.
- Micro du widget Élio Hub : bouton présent, non fonctionnel.

### ↩️ Décisions produit récentes (traces résiduelles dans le code)
- **Tier « One+ » agentique abandonné** (décision 2026-06-26) : l'agentique IA devient du sur-mesure au devis. La mécanique de tier existe encore en code mais le comportement est désactivé côté produit.
- **Facturation « le client facture ses propres clients »** retirée de One (conservée en bibliothèque pour usage futur).

---

## 8. Argumentaire CII — synthèse

MonprojetPro constitue un **nouveau produit** dont les fonctionnalités, l'ergonomie et l'architecture **dépassent l'état de l'art** des SaaS d'accompagnement / CRM / no-code :

- **Fonctionnalités supérieures** : parcours entrepreneurial piloté par une IA experte multi-agents, avec supervision humaine intégrée (modèle Centaure) — au lieu d'un simple chatbot ou d'un CRM passif.
- **Ergonomie supérieure** : un cycle de vie unifié Lab→One sans rupture, branding client dynamique à contraste garanti, temps réel généralisé.
- **Innovation d'architecture** : multi-tenancy sans provisioning, modularité plug & play, continuité de contexte IA sans migration, kit de sortie réversible — autant de **verrous techniques** dont la résolution relève d'une démarche d'innovation caractérisée.

Ces éléments documentent la **capacité de l'entreprise à réaliser des opérations d'innovation**, objet de la demande d'agrément CII.

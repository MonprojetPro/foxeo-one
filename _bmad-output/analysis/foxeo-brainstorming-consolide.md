# FOXEO - Brainstorming Consolidé

**Date de consolidation :** 26 Janvier 2026
**Sources :** Brainstorming 23/01 + Party Mode 25/01 + UX Spec + Stack Technique
**Statut :** Document de référence unique (remplace les versions précédentes)

---

## Table des Matières

1. [Vision & Positionnement](#vision--positionnement)
2. [Les 25 Fondamentaux](#les-25-fondamentaux)
3. [Architecture Écosystème](#architecture-écosystème)
4. [Les Agents IA](#les-agents-ia)
5. [Le Validation Hub](#le-validation-hub)
6. [Parcours Utilisateurs](#parcours-utilisateurs)
7. [Fonctionnalités par Dashboard](#fonctionnalités-par-dashboard)
8. [Priorisation P1/P2/P3](#priorisation-p1p2p3)
9. [Business Model](#business-model)
10. [Design System V1](#design-system-v1)
11. [Stack Technique](#stack-technique)
12. [Risques & Contre-mesures](#risques--contre-mesures)
13. [Verticales Cibles](#verticales-cibles)
14. [Différenciateurs Clés](#différenciateurs-clés)

---

## Vision & Positionnement

### Le Projet

**Nom :** MonprojetPro
**Porteur :** MiKL
**Type :** Écosystème de dashboards modulaires professionnels

### Objectifs

1. Construire un outil pour ses propres besoins (gestion clients, projets)
2. Créer un template réutilisable pour livrer des projets similaires à des clients
3. Potentiellement le transformer en produit verticalisé (SaaS)

### Positionnement

> **MonprojetPro n'est pas un simple dashboard. C'est un incubateur personnel qui accompagne de l'idée au business opérationnel, avec les outils intégrés.**

### Le Modèle "Centaure"

> Tu ne vends plus un logiciel, tu vends une **disponibilité infinie** (IA 24/7) couplée à une **expertise haute couture** (MiKL).

- **Élio** : Agent IA disponible 24/7 pour structurer et stimuler
- **MiKL** : Expertise humaine pour les validations stratégiques

Le client ne voit jamais "BMAD" — pour lui, c'est Élio qui l'accompagne.

---

## Les 25 Fondamentaux

### Nature du Produit (1-4)

| # | Titre | Concept |
|---|-------|---------|
| 1 | **Le Temps comme Monnaie Ultime** | Le temps est la seule ressource non-renouvelable. Un dashboard modulaire est un outil de compression temporelle. |
| 2 | **La Simplification Cognitive** | Moins de contextes = moins de charge mentale. L'ergonomie est une économie d'énergie cérébrale. |
| 3 | **Consolidation Économique** | Plusieurs outils = plusieurs coûts. Le dashboard est un agrégateur de valeur. |
| 4 | **L'Assistant, pas l'Outil** | Un outil on l'utilise et on le pose. Un assistant est là, connaît le contexte, anticipe. |

### Architecture & Modèle (5-9)

| # | Titre | Concept |
|---|-------|---------|
| 5 | **Architecture Template + Personnalisation** | Base solide commune (noyau) + couches de personnalisation par client. Modèle LEGO. |
| 6 | **Le Chatbot comme Pont Relationnel** | Le chatbot n'est pas du support, c'est un canal de relation continue. Il structure les besoins AVANT qu'ils arrivent. |
| 7 | **L'Assistant remplace la Documentation** | Pas de mode d'emploi ni de vidéos. L'outil s'explique lui-même via conversation contextuelle. |
| 8 | **Le Cycle Vertueux BMAD** | BMAD génère de la documentation automatiquement → enrichit le chatbot → améliore l'expérience client. |
| 9 | **Dashboard Miroir** | MiKL utilise son propre produit pour gérer ses clients = amélioration continue garantie. |

### Workflow Client (10-14)

| # | Titre | Concept |
|---|-------|---------|
| 10 | **Deux Niveaux d'Analyse** | Agent simplifié côté client (Élio) + Agent complet côté MiKL (Orpheus). |
| 11 | **L'Humain au Centre** | Appel téléphone/visio = irremplaçable. L'IA structure avant et après, le moment de vérité reste HUMAIN. |
| 12 | **Transcription → Documentation Auto** | Réunion enregistrée, réponses alimentent automatiquement le projet. Tu parles, le système documente. |
| 13 | **Ping-Pong Dashboard Structuré** | Allers-retours via dashboard (pas email chaotique) jusqu'à identification du besoin réel. |
| 14 | **Déploiement à Distance** | MiKL implémente directement dans le dashboard client sans intervention de sa part. Effet "magie". |

### Business Model (15-20)

| # | Titre | Concept |
|---|-------|---------|
| 15 | **Triple Source de Revenus** | Setup (cash initial) + Abo (récurrent) + Évolutions (croissance). |
| 16 | **L'Abonnement Justifié par le Chatbot** | Le client paie pas "pour rien" - assistant actif, support, micro-évolutions. Valeur perçue claire. |
| 17 | **Les Évolutions via Workflow** | Nouveau besoin → Chatbot structure → Brief → BMAD → Devis. Process visible. |
| 18 | **Verrouillage Positif** | Plus le client utilise, plus il a d'historique/données/modules. Partir = perdre tout ça. |
| 19 | **Écosystème Front + Back** | Dashboard (back-office) + Site vitrine (front) connectés. Tout remonte au dashboard. |
| 20 | **Hub d'Intégrations** | LinkedIn, CRM, autres outils connectés au dashboard. |

### Parcours Client - 2 Dashboards (21-25)

| # | Titre | Concept |
|---|-------|---------|
| 21 | **Deux Portes d'Entrée** | Porte A : Client mûr → MonprojetPro-One. Porte B : Client en construction → MonprojetPro-Lab → MonprojetPro-One. |
| 22 | **La Graduation comme Moment Fort** | Passage Lab → One = événement. "Votre business est structuré, on passe en production." |
| 23 | **Mémoire Persistante** | Tout ce qui a été créé en Lab reste accessible dans MonprojetPro-One. |
| 24 | **Transparence Temps Réel** | Chat direct = client voit l'avancement au fur et à mesure. |
| 25 | **Micro-Ajustements vs Grosses Révisions** | Réajustements en continu = jamais de décalage en fin de projet. |

---

## Architecture Écosystème

### Nomenclature Officielle (Finalisée 25/01/2026)

| Dashboard | Utilisateur | Fonction | Agent IA | Couleur Primary |
|-----------|-------------|----------|----------|-----------------|
| **FOXEO-HUB** | MiKL | Cockpit central, gestion clients, visio, dossiers BMAD | **Orpheus** | Bleu nuit + cuivre |
| **FOXEO-LAB** | Client en création | Incubation, accompagnement, Validation Hub | **Élio Lab** | Terracotta/Corail |
| **FOXEO-ONE** | Client établi | Outil métier personnalisé avec modules | **Élio One** | Orange vif + bleu-gris |

### Parcours Client Global

```
PORTE A (Client mûr) ──────────────────────────────┐
                                                   │
PORTE B (Client en construction)                   │
        │                                          │
        ▼                                          │
┌─────────────────────────┐                        │
│      FOXEO-LAB          │                        │
│  "De l'idée au business"│                        │
│  • Élio Lab (LLM)       │                        │
│  • Validation Hub        │                        │
│  • Documents partagés   │                        │
│  • Validation étapes    │                        │
└───────────┬─────────────┘                        │
            │                                      │
    🎓 GRADUATION                                  │
            │                                      │
            ▼                                      │
┌─────────────────────────┐◄───────────────────────┘
│      FOXEO-ONE          │
│  "Du business à l'action"│
│  • Élio One (support)   │
│  • Modules métier       │
│  • Intégrations         │
│  • Évolutions continues │
│  • Mémoire Lab conservée│
└─────────────────────────┘
```

### Architecture Multi-tenant

```
CODE SOURCE UNIQUE (Core)
        │
        ▼
┌─────────────────────────────────┐
│  Table: client_config           │
├─────────────────────────────────┤
│  client_id: "client_xyz"        │
│  dashboard_type: "lab" | "one"  │
│  modules_actifs: [...]          │
│  theme: "dark" | "light"        │
│  custom_config: {...}           │
└─────────────────────────────────┘

→ Une mise à jour = déployée chez TOUS les clients instantanément
→ Personnalisation via configuration, pas via code custom
```

---

## Les Agents IA

### Architecture des Agents

| Agent | Dashboard | Rôle | Technologie |
|-------|-----------|------|-------------|
| **Orpheus** | MonprojetPro-Hub | Assistant MiKL unique, connaissance complète entreprise | Import projet BMAD existant |
| **Élio Lab** | MonprojetPro-Lab | Guide création, challenger, accompagne l'incubation | LLM connecté (Claude API) |
| **Élio One** | MonprojetPro-One | Support technique + structuration demandes évolutions | Mode support (pas LLM création) |

### Élio Lab - Fonctions

| Fonction | Description |
|----------|-------------|
| **Guidance projet** | Pose des questions simples pour clarifier le projet |
| **Questions de découverte** | Aide à reformuler les idées floues |
| **Suivi des devoirs** | Rappelle où en est le client, relance |
| **Préparation sessions** | Prépare le client avant un RDV avec MiKL |
| **Mode Challenger** | Ne valide jamais une idée floue, demande "Pourquoi ?" |
| **Validation Hub** | Structure les soumissions vers MiKL |

### Élio One - Fonctions

| Fonction | Description |
|----------|-------------|
| **Guide d'utilisation** | Répond aux questions sur l'outil |
| **Support technique** | Aide en cas de problème |
| **Structuration évolutions** | Transforme une demande vague en brief structuré |
| **Validation Hub** | Soumet les demandes d'évolution à MiKL |

### Ce qu'Élio NE FAIT PAS

| Fonction | Pourquoi c'est réservé à MiKL |
|----------|-------------------------------|
| ❌ Analyse stratégique profonde | C'est la valeur de MiKL |
| ❌ Décisions business | Le client doit décider avec MiKL |
| ❌ Création de livrables | Logos, chartes = travail de MiKL |
| ❌ Conseils experts | Positionnement, pricing = expertise MiKL |
| ❌ Validation d'étapes | Seul MiKL valide qu'une étape est OK |

### Mode Challenger (Élio Lab)

```yaml
règles:
  - Ne jamais valider une idée floue
  - Toujours demander "Pourquoi ?" au moins 2 fois
  - Reformuler pour vérifier la compréhension
  - Pointer les incohérences avec bienveillance
  - Rappeler les décisions précédentes de MiKL

phrases_type:
  - "Intéressant ! Mais concrètement, ça donnerait quoi ?"
  - "Tu as dit X la dernière fois, et maintenant Y. Qu'est-ce qui a changé ?"
  - "Si ton client idéal entendait ça, il comprendrait ?"

limites:
  - Ne jamais contredire une validation de MiKL
  - Ne jamais prendre de décision stratégique seul
  - Toujours renvoyer vers MiKL en cas de doute
```

### Système d'Escalade Élio → MiKL

```
CLIENT pose une question
        ↓
🦊 ÉLIO cherche dans sa base
        ↓
   Trouvé ?
   ├─→ ✅ OUI → Répond au client
   └─→ ❌ NON ou INCERTAIN
              ↓
   🦊 ÉLIO propose l'escalade :
   "Je ne suis pas sûr... Tu veux que je contacte MiKL ?"
              ↓ (si oui)
   📨 NOTIFICATION dans MonprojetPro-Hub
   → MiKL répond via Chat direct
```

### Migration Lab → One

- Le client garde accès à son Lab depuis One (onglet "Historique Lab")
- Tous les documents créés en Lab sont accessibles en lecture
- Élio Lab est **désactivé par défaut** après graduation
- MiKL peut **réactiver** Élio Lab si le client a besoin d'un retour au laboratoire

---

## Le Validation Hub

### Workflow de Validation

```
                         1. RÉFLEXION
                      (Client + Élio 🦊)
                              │
                              │ Travail structuré
                              │
                              ▼
           ┌──────────────────────────────────────┐
           │  📤 "SOUMETTRE À MIKL"               │
           │  • Élio génère un RÉSUMÉ             │
           │  • Status: ⏳ PENDING                 │
           └──────────────────────────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
        ▼                                           ▼

  2. SUPERVISION                              3. VERDICT
  (MiKL reçoit dans Hub)                      (MiKL décide)

  • Notification                              ✅ Validé
  • Résumé Élio                               └→ Étape suivante débloquée
  • Proposition finale
                                              💬 Commentaire
                                              └→ Chat/Screenshot

                                              📹 Visio
                                              └→ RDV planifié
```

### Les 3 Options de Verdict

| Action | Quand l'utiliser | Ce que le client reçoit |
|--------|------------------|------------------------|
| **✅ Valider** | C'est bon, on passe à la suite | Notification "Validé !" + Étape suivante débloquée |
| **💬 Commenter** | Besoin de préciser un point | Message texte avec retours |
| **📹 Visio** | Sujet complexe | RDV planifié |

### Gain pour MiKL

| Avant (sans Validation Hub) | Après (avec Validation Hub) |
|---------------------------|---------------------------|
| Client arrive sans préparation | Client a déjà réfléchi avec Élio |
| Tu poses les questions de base | Élio a déjà posé les questions |
| Tu structures depuis zéro | Tu reçois une proposition structurée |
| 1h de RDV pour dégrossir | 15 min pour valider/pivoter |

---

## Parcours Utilisateurs

### Phase 0 : Acquisition

```
Prospect découvre MiKL (Site, LinkedIn, Bouche-à-oreille)
                    ↓
         Prise de RDV (lien calendrier)
```

### Phase 1 : Qualification (MonprojetPro-Hub)

```
• Visio intégrée dans MonprojetPro-Hub
• Enregistrement + Transcription auto
• Création fiche client (CRM auto-rempli)
• Création dossier BMAD (invisible client)
                    ↓
🎯 DÉCISION MiKL : Quel parcours ?
   [A] Direct → MonprojetPro-One
   [B] Incubation → MonprojetPro-Lab
```

### Parcours A : Direct (Client mûr → MonprojetPro-One)

```
PHASE 2: CONFIGURATION
├─→ MiKL configure le dashboard
│   • Sélection template (Lite/Pro)
│   • Activation modules selon besoin
│   • Personnalisation (nom, logo, couleurs)
├─→ Devis + Paiement setup

PHASE 3: ONBOARDING
├─→ Client reçoit ses accès
├─→ Session formation (visio)

PHASE 4: UTILISATION AUTONOME
├─→ Client gère son activité
├─→ Élio One disponible pour aide

PHASE 5: ÉVOLUTIONS (Boucle continue)
├─→ Nouveau besoin → Élio structure
├─→ Soumettre via Validation Hub
├─→ MiKL évalue (micro-évolution ou devis)
```

### Parcours B : Incubation (Client en création → MonprojetPro-Lab → MonprojetPro-One)

```
PHASE 2: ONBOARDING FOXEO-LAB
├─→ MiKL configure le dashboard Lab
├─→ Client reçoit ses accès
├─→ 1ère connexion guidée par Élio Lab

PHASE 3: INCUBATION (Boucle répétée)
│  CLIENT travaille avec Élio Lab
│  • Répond aux questions
│  • Complète ses "devoirs"
│           ↓
│  CLIENT soumet à MiKL (Validation Hub)
│           ↓
│  MiKL valide/commente/visio
│           ↓
│  (Répéter jusqu'à graduation)

PHASE 4: GRADUATION
├─→ Toutes les étapes validées
├─→ Rituel de passage (célébration)
├─→ Migration vers MonprojetPro-One
│   • Mémoire Lab conservée
│   • Élio Lab désactivé (réactivable)

PHASE 5: CLIENT ÉTABLI
└─→ (Voir Parcours A - Phase 4+)
```

### Journée type MiKL sur MonprojetPro-Hub

```
🌅 MATIN - Prise de poste
├─→ Vue Accueil :
│   • Agenda du jour (RDV visio)
│   • Actions prioritaires
│   • Messages non lus
│   • Validations en attente (Validation Hub)

📋 MATINÉE - Travail client
├─→ Visio planifiée
│   • Lancer depuis MonprojetPro-Hub
│   • Enregistrement auto
│   • Post-visio : fiche client, décision parcours
├─→ Validations Validation Hub
│   • Lire résumé Élio
│   • Décider : ✅ | 💬 | 📹

🔧 APRÈS-MIDI - Production
├─→ Travail sur projets clients
├─→ Envoi via Chat (screenshots, docs)
├─→ Visios planifiées

📊 FIN DE JOURNÉE
├─→ Check final (messages, validations)
└─→ Agenda du lendemain
```

---

## Fonctionnalités par Dashboard

### MonprojetPro-Hub (MiKL)

| Module | Description | Priorité |
|--------|-------------|----------|
| **Clients** | Liste clients, fiches, statuts, filtres avancés | P1 |
| **CRM** | Fiche relationnelle complète (photo, anniversaire, notes perso) | P1 |
| **Projets** | Suivi projets, étapes, progression, timeline | P1 |
| **Agenda** | Planning, RDV, synchro bidirectionnelle Google Calendar | P1 |
| **Visio** | Lancer/rejoindre réunions intégrées, enregistrement | P1 |
| **Transcription** | Retranscription auto des visios via API | P1 |
| **Chat Direct** | Communication MiKL ↔ Client | P1 |
| **Validation Hub** | File de validations en attente, workflow validation | P1 |
| **Facturation** | Devis, factures, paiements, compta (via Pennylane API v2) | P1 |
| **Documents** | Stockage, partage, versionnage, système de tags | P1 |
| **Orpheus** | Agent IA assistant MiKL | P1 |
| **Audit & Logs** | Historique des actions, debug support client | P1 |
| **Analytics** | Stats CA, clients actifs, temps passé | P2 |

### MonprojetPro-Lab (Client en création)

| Module | Description | Priorité |
|--------|-------------|----------|
| **Parcours & Étape** | Progression globale visible + détail étape en cours | P1 |
| **Documents** | Système unifié avec tags (Livrable, Ressource, Devoir) | P1 |
| **Élio Lab** | Agent IA guide création (LLM connecté) | P1 |
| **Chat MiKL** | Communication directe avec MiKL | P1 |
| **Agenda / RDV** | Prochain RDV visible, lien visio, historique | P1 |
| **Visio** | Rejoindre les visios avec MiKL | P1 |
| **Validation Hub** | Bouton "Soumettre à MiKL", statut des soumissions | P1 |
| **Facturation** | Consulter ses factures, historique paiements | P1 |

### MonprojetPro-One (Client établi)

| Module | Description | Priorité |
|--------|-------------|----------|
| **Dashboard Home** | Vue d'ensemble métier, KPIs configurables | P1 |
| **Clients** | Mini-CRM pour gérer SA propre clientèle | P1 |
| **Agenda** | Son planning personnel, synchro calendrier | P1 |
| **Documents** | Ses fichiers, modèles, classement par tags | P1 |
| **Élio One** | Agent IA support + structuration évolutions | P1 |
| **Chat MiKL** | Communication avec MiKL pour support/évolutions | P1 |
| **Visio** | Visio intégrée | P1 |
| **Intégrations** | Connexions externes (Google, LinkedIn...) | P1 |
| **Mémoire Lab** | Accès aux docs/décisions de la phase Lab | P1 |
| **Évolutions** | Demander une évolution via Validation Hub | P1 |
| **Facturation** | Générer SES devis/factures à SES clients | P2 |
| **[Modules Spécifiques]** | Activables depuis la bibliothèque | Sur demande |

---

## Priorisation P1/P2/P3

### 🔴 P1 - MVP Essentiel

#### Architecture (CRITIQUE)
- Structure Lego modulaire (noyau commun intouchable)
- Système de configuration par client
- Multi-tenant avec table client_config

#### Communication
- Chat direct MiKL ↔ Client (2 canaux : Élio + MiKL)
- Agents IA (Orpheus, Élio Lab, Élio One)
- Notifications in-app + email
- Centre de notifications (historique interne)

#### Vidéo & Réunions
- Visio intégrée (OpenVidu self-hosted)
- Enregistrement des entretiens
- Retranscription (Vosk MVP → Deepgram prod)
- Résumé optimisé pour gestion de projet

#### Projet
- Historique étapes / documents / RDV
- Module "Devoirs" client (étapes à franchir + relances)
- Partage éléments (screenshots, images, docs)
- Templates de projet
- Barre de progression visuelle

#### Validation Hub
- Bouton "Soumettre à MiKL"
- File de validations en attente (MonprojetPro-Hub)
- Résumé auto par Élio
- 3 options de verdict (Valider / Commenter / Visio)
- Notification client du verdict

#### CRM & Admin
- Fiche client complète (photo, anniversaire, CV, notes)
- Recherche globale / Navigation intelligente
- Historique décisions MiKL (pour aligner Élio)

#### Facturation
- Génération devis / factures (Pennylane)
- Suivi paiements
- Intégration Stripe
- Dépôt documents comptables (côté client)

#### Intégrations
- Google Calendar (synchro bidirectionnelle)

#### UX
- Responsive design (mobile/tablette)
- Onboarding guidé
- Mode Dark par défaut + toggle Light

#### Légal & Sécurité
- CGU / CGV / RGPD
- Chiffrement données
- Auth sécurisée (Supabase Auth)
- Export données / Suppression compte

### 🟠 P2 - Version 2

- Authentification 2FA
- Sessions actives
- Notifications push (mobile/desktop)
- Préférences de notifications
- Historique récent / Filtres avancés
- Dashboard stats (CA, clients, temps, projets)
- Rapports exportables (PDF, Excel)
- Compteur de valeur produite
- Emails automatiques (anniversaire, bienvenue, relance)
- Relances factures impayées
- PWA mobile (installable)
- Célébrations milestones (animations)
- Logo personnalisé (white label)

### 🟡 P3 - Version 3+

- Multi-utilisateurs (équipe client)
- Rôles & permissions
- Logs d'activité (audit trail)
- Favoris / Épingles / Raccourcis clavier
- Timer temps passé par projet
- Analytics client (dans leur dashboard)
- LinkedIn / Zapier / Make
- API publique / Webhooks
- Mode hors-ligne
- Thèmes couleurs personnalisables
- Domaine personnalisé
- Multi-langue
- Gamification (badges, streaks)

---

## Business Model

### Tarification

#### Offre Lab (Incubation)

| Élément | Prix |
|---------|------|
| Setup initial | 1 500 - 3 000 € |
| Accompagnement mensuel | 500 €/mois |
| Durée moyenne | 2-4 mois |

**Inclus :** Élio Lab 24/7 + Validations MiKL + Visios + Livrables

#### Offre One (Outil métier)

| Élément | Prix |
|---------|------|
| Setup initial | 2 500 - 6 000 € |
| Abonnement mensuel | 200 - 400 €/mois |
| Évolutions majeures | Sur devis (workflow Validation Hub) |

**Inclus :** Élio One + Support + Mises à jour + Intégrations

#### Pack Complet "De Zéro à Héros"

| Élément | Prix |
|---------|------|
| Lab + Graduation + One | 4 000 - 8 000 € setup |
| + Abonnements mensuels | Selon formule |

### Triple Source de Revenus

1. **Setup** - Cash initial pour configurer le dashboard
2. **Abonnement** - Récurrent mensuel (justifié par Élio + support)
3. **Évolutions** - Sur devis via workflow Validation Hub

### Perception Prix (Modèle Centaure)

| Offre | Ancienne Perception | Nouvelle Perception |
|-------|--------------------|--------------------|
| Setup | "Cher pour un dashboard" | "Prix d'entrée pour une stratégie BMAD" |
| 400-500€/mois | "Abusé pour un logiciel" | "Donné pour un accès 24/7 à une expertise" |

---

## Design System V1

### Stack Design

| Élément | Choix |
|---------|-------|
| **Composants** | shadcn/ui + 21st.dev (payants validés au cas par cas) + Radix UI |
| **Styling** | Tailwind CSS 4 |
| **Typographie** | Poppins (titres/UI) + Inter (corps) |
| **Format couleurs** | OKLCH (Tailwind v4 ready) |
| **Générateur thèmes** | tweakcn.com |

### Palettes par Dashboard

| Dashboard | Ambiance | Primary (OKLCH) | Mode défaut |
|-----------|----------|-----------------|-------------|
| **FOXEO-HUB** | Bleu nuit + cuivre | `oklch(0.3640 0.0489 211)` | Dark |
| **FOXEO-LAB** | Terracotta/Corail | `oklch(0.6541 0.1270 33)` | Dark |
| **FOXEO-ONE** | Orange vif + bleu-gris | `oklch(0.7175 0.1747 50)` | Dark |

### Particularités par thème

| Thème | Radius | Font Mono | Ombres |
|-------|--------|-----------|--------|
| **HUB** | 0.375rem | Geist Mono | Subtiles, bleutées |
| **LAB** | 0.5rem | monospace | Chaudes (#3D1B16) |
| **ONE** | 0.5rem | JetBrains Mono | Neutres (#000000) |

### Préférence de thème

- Mode par défaut : Dark pour les 3 dashboards
- Toggle utilisateur : Oui, chaque utilisateur peut basculer en Light
- Persistance : Préférence sauvegardée par utilisateur

---

## Stack Technique

### Vue d'Ensemble

| Couche | Technologie |
|--------|-------------|
| **Frontend** | Next.js 16 + React 19 + Tailwind 4 |
| **UI Components** | shadcn/ui + 21st.dev + Radix UI |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth |
| **Storage** | Supabase Storage (+ serveur dédié - décision en attente) |
| **Realtime / Chat** | Supabase Realtime |
| **Visio** | OpenVidu (self-hosted) |
| **Transcription** | Vosk (MVP) → Deepgram API (prod) |
| **Facturation** | Pennylane (self-hosted) |
| **Paiements** | Stripe (via Pennylane) |
| **Agents IA** | Claude API (Anthropic) |
| **Hosting Front** | Vercel |
| **Hosting Services** | VPS (OpenVidu, Pennylane) |

### Stratégie de Développement

| Priorité | Approche |
|----------|----------|
| **1er** | Solution open source gratuite existante |
| **2ème** | Template/composant payant (si raisonnable) |
| **3ème** | Développement custom (dernier recours) |

### Décisions Architecturales Clés

1. **Multi-tenant avec Configuration** - Un seul code source + table de configuration par client
2. **Notifications Configurables** - L'utilisateur configure ses préférences
3. **Documents Unifiés avec Tags** - Un seul module Documents avec système de tags
4. **Visio Open Source** - OpenVidu self-hosted (pas de coûts récurrents)
5. **Facturation via Pennylane** - Open source, API complète, Stripe intégré

---

## Risques & Contre-mesures

### Risques Projet

| Risque | Impact | Contre-mesure |
|--------|--------|---------------|
| Temps de réponse trop lent | Élevé | SLA visible, statuts clairs, Élio disponible 24/7 |
| Bugs / Instabilité | Élevé | MVP stable, tests, feedback intégré |
| Usine à gaz / Complexité | Moyen | Onboarding progressif, "less is more" |
| Décalage avec attentes | Élevé | Validations étape par étape (Validation Hub) |
| Surcharge travail MiKL | Moyen | Élio qui dégrossit, vue charge de travail |

### Risques Techniques

| Risque | Description | Contre-mesure |
|--------|-------------|---------------|
| L'Enfer de la Maintenance | Mises à jour vs personnalisations | Architecture Lego stricte : noyau + modules + config |
| Dépendance à l'Expert | Tout repose sur MiKL | Méthode BMAD via Élio, templates reproductibles |
| Souveraineté des données | Stockage = cible critique | Sécurité dès J1, chiffrement, backups |

### Risques Agent IA

| Risque | Description | Contre-mesure |
|--------|-------------|---------------|
| IA "Béni-oui-oui" | L'IA valide tout pour faire plaisir | Mode "Challenger" : Élio doit pousser le client |
| Effet Déceptif | IA dit "A", MiKL dit "B" | Élio a accès à l'historique des décisions MiKL |
| Flemme du client | "L'IA le fera pour moi" | Bien préciser : Élio structure, le CLIENT décide |

---

## Verticales Cibles

### Tier 1 - Naturels (très proches de l'ADN MiKL)

- Coachs (business, vie, sport)
- Consultants (stratégie, RH, digital)
- Freelances créatifs (design, dev)
- Formateurs / Organismes de formation

### Tier 2 - Fort potentiel (à adapter)

- Architectes / Architectes d'intérieur
- Wedding / Event planners
- Photographes / Vidéastes
- Agences marketing / Com

### Tier 3 - Niches intéressantes

- Avocats / Notaires
- Comptables / Experts-comptables
- Praticiens bien-être
- Personal trainers

### Recommandation pour le lancement

Viser ceux qui ont un **panier moyen élevé** et un **besoin de structure** :
1. Consultants en Stratégie / Coachs Business
2. Agences de Marketing "Boutique"
3. Architectes / Maîtres d'œuvre

---

## Différenciateurs Clés

### Les 7 Avantages Concurrentiels

1. **Élio qui structure les demandes** - Pas juste du support, un vrai canal de brief intelligent
2. **Relation humaine préservée** - L'IA augmente, ne remplace pas
3. **Documentation auto-générée par BMAD** - Cycle vertueux : BMAD → Doc → Élio → Meilleure XP
4. **Déploiement à distance** - Effet "magie" pour le client
5. **Parcours client complet** - De l'idée (Lab) à l'outil opérationnel (One)
6. **CRM relationnel** - Se souvenir de QUI est le client, pas juste ce qu'il doit
7. **Modèle Centaure** - IA 24/7 + Expertise haute couture MiKL

### Le Pitch en Une Phrase

> "MonprojetPro : Ton compagnon de route pour construire et piloter ton business, avec Élio l'assistant IA et MiKL l'expert qui valide chaque étape."

---

## Décisions en Attente

| Décision | Statut | Notes |
|----------|--------|-------|
| Stockage serveur | En attente | MiKL consulte un ami développeur (Supabase seul vs Hybride) |

---

## Historique des Décisions

| Date | Décision |
|------|----------|
| 23/01/2026 | Architecture 3 dashboards, Agent Élio, Validation Hub, 25 fondamentaux |
| 25/01/2026 | Nomenclature officielle (Hub/Lab/One), Agents (Orpheus/Élio Lab/Élio One) |
| 25/01/2026 | Design System V1 (shadcn/ui, OKLCH, palettes par dashboard) |
| 25/01/2026 | Stack technique validée (OpenVidu, Pennylane, Supabase, Deepgram) |
| 25/01/2026 | Migration Lab→One avec mémoire persistante et Élio Lab désactivable |

---

*Document consolidé le 26 Janvier 2026*
*Remplace : monprojetpro-one-brainstorming-complet-final.md, monprojetpro-one-resume-complet.md, brainstorming-session-2026-01-23.md*

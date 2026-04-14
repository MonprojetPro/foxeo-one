# Flow d'onboarding unifié MonprojetPro

## Metadata

- **Date** : 2026-04-14
- **Statut** : Validé par MiKL
- **Référence** : ADR-01 Révision 2 + Stories Epic 13
- **Auteur** : OTTO (PM)
- **Documents liés** : `prd/types-de-clients.md`, `prd/user-journeys.md`, `architecture/*`

---

## Contexte et objectif

Ce document formalise la décision prise par MiKL le 2026-04-14 concernant le flow commercial et technique d'onboarding des clients MonprojetPro. Il clarifie et unifie plusieurs éléments qui étaient jusqu'ici partiels ou contradictoires dans `types-de-clients.md` et `user-journeys.md` :

- Les 3 chemins commerciaux et leurs modalités de paiement.
- La relation entre le Lab (offre d'appel) et le One (produit principal).
- Le tunnel automatique paiement → création de compte.
- Le besoin d'impersonation MiKL pour support/debug.
- La différenciation des kits de sortie selon le parcours.

Il sert de référence unique pour l'implémentation de l'Epic 13 et complète (sans remplacer) les documents PRD existants.

---

## Principe directeur : simplification

**Un seul "One de base" pour tous les clients.** Même template, mêmes modules par défaut, même architecture. Ce qui varie d'un client à l'autre :

1. Les **modules additionnels** activés (catalogue ou sur-mesure).
2. Le **plan de facturation** (setup + abonnement mensuel, ou forfait ponctuel).
3. L'accès ou non au **parcours Lab** en amont.

Les anciennes catégories techniques `complet / direct_one / ponctuel` cessent de piloter la logique métier. Elles restent présentes à titre d'**étiquettes commerciales historiques**, utiles pour le reporting et la segmentation, mais les workflows s'appuient désormais sur `client_configs` (dashboard_type, active_modules, lab_mode_available, elio_lab_enabled).

**Modules One par défaut (à valider à l'usage)** : `core-dashboard`, `chat`, `documents`, `elio-one`. Tout autre module (CRM, visio, facturation, site public, modules sur-mesure) est ajouté à la carte selon le devis accepté.

**Le Lab est l'offre d'appel** : 199€ forfait fixe, stratégique pour capter les prospects et produire un PRD structuré avant le développement. Encouragé pour tout le monde, mais jamais obligatoire. Il permet à MiKL de gagner du temps en arrivant sur la phase dev avec un cahier des charges déjà formalisé.

---

## Les 3 entrées prospect

Un prospect entre dans le Hub par l'une de ces 3 sources (existantes) :

| Source | Mécanisme | Statut |
|--------|-----------|--------|
| **Site form** | Webhook site public → `prospects.create` | Existant |
| **Cal.com booking** | Webhook Cal.com → `prospects.create` + visio réservée | Existant |
| **Création manuelle Hub** | MiKL ajoute un prospect via l'UI Hub | Existant |

Quelle que soit la source, le prospect atterrit dans la liste "Prospects" du Hub avec un statut initial. La première action commerciale est toujours la **visio découverte** (Cal.com), à l'issue de laquelle MiKL propose un des 3 chemins.

---

## Les 3 chemins commerciaux proposés en visio

À la fin de la visio découverte, MiKL ouvre le dialog "Post-visio" dans le Hub et choisit le chemin à proposer.

| Chemin | Lab | One direct | Ponctuel |
|--------|-----|------------|----------|
| **Prix** | 199€ forfait fixe | Setup + abonnement mensuel | Forfait projet |
| **Paiement** | 100% upfront | 30% acompte + 70% à la livraison | 30% acompte + 70% à la livraison |
| **Dashboard** | Lab (thème violet) | One (vert/orange) | One (vert/orange) limité |
| **Durée** | Parcours structuré 5 étapes | Permanent (abo mensuel) | Temporaire (durée mission) |
| **Graduation** | Possible vers One | Non applicable | Non applicable |
| **Kit de sortie** | Lab (Story 13.2) | One (Story 13.1) | One (Story 13.1) |
| **Recommandation** | Défaut pour la plupart des cas | Client qui sait ce qu'il veut | Mission unique, pas d'abo |

Dans tous les cas, le devis est ensuite **envoyé via Pennylane** (Story 11.3 existante), le client signe, et le paiement conditionne l'ouverture de l'accès.

---

## Le tunnel paiement → création compte (Story 13.4)

Lorsque Pennylane notifie qu'une facture a été payée, un webhook déclenche automatiquement le workflow suivant :

1. **Réception du webhook Pennylane** `invoice.paid` avec `invoice_id` et `amount`.
2. **Vérification du montant** attendu selon le chemin : 100% pour Lab, 30% acompte pour One direct et Ponctuel.
3. **Création du compte Supabase** `auth.users` avec l'email du client issu du devis.
4. **Génération d'un mot de passe temporaire** (random secure, 16 caractères).
5. **Envoi d'un email d'invitation** contenant le lien vers `/login`, l'email et le mot de passe temporaire.
6. **Premier login** : le middleware force le changement de mot de passe avant toute navigation.
7. **Activation de l'accès** : `dashboard_type = 'lab'` ou `'one'`, selon le chemin choisi.
8. **Activation des modules** : la liste `active_modules` est construite à partir du devis accepté (modules par défaut + add-ons).

Le même webhook, sur le second paiement (70% final One/Ponctuel), met à jour `client_configs.final_payment_at` et ne déclenche pas de nouvelle création de compte.

---

## Impersonation MiKL (Story 13.3)

**Besoin business** : MiKL doit pouvoir se connecter comme un client pour débugger, reproduire un bug signalé, ou assister le client en direct pendant un appel support.

**Implémentation** :

- Bouton **"Se connecter en tant que ce client"** sur la fiche client Hub.
- Nouvelle route `/hub/impersonate/{clientId}` qui génère un **JWT temporaire** (durée limitée, claim `impersonated_by: mikl_user_id`).
- **Banner fixe** visible côté client pendant toute la session : "🛡️ Session support MiKL — actions enregistrées".
- **Audit log** dans `activity_logs` avec `actor_type: 'operator_impersonation'` pour chaque action effectuée pendant la session.

**Interdictions** (vérifiées côté serveur) :
- Changer le mot de passe du client.
- Supprimer le compte.
- Supprimer des données client.

**Autorisations** :
- Voir tous les modules et toutes les données du client.
- Utiliser les fonctionnalités normalement (créer documents, envoyer messages, etc.).
- Corriger du contenu (fix typo, ajustement de config).

---

## Les 2 kits de sortie (différenciés)

### Kit de sortie Lab (Story 13.2) — simple

Déclenché par MiKL depuis la fiche client quand un prospect arrête son parcours Lab sans graduer vers le One.

- **Contenu du ZIP** : documents générés dans le Lab, briefs validés, transcript complet du chat Élio Lab, PRD final structuré.
- **Livraison** : email au client avec lien de téléchargement signé (valide 7 jours) ou pièce jointe directe.
- **État client** : passage en `status: 'archived_lab'` dans la table `clients`.
- **Conséquence** : l'accès au dashboard Lab est coupé après téléchargement confirmé.

### Kit de sortie One (Story 13.1 — déjà rédigée) — complexe

Déclenché par MiKL quand un client arrête son abonnement One.

- **Provisioning** : Vercel + GitHub + Supabase dédiés au client.
- **Code** : push du build standalone (Lab + agents tree-shaken aux modules réellement utilisés).
- **Données** : export RLS-filtered de toute la DB client.
- **Support post-sortie** : **1 mois gratuit** pendant lequel MiKL reste disponible pour corriger les bugs critiques et accompagner la prise en main côté client. Ce mois inclus est mentionné explicitement dans le devis de départ pour éviter toute ambiguïté commerciale.

---

## Stockage des dépendances (nouvelles tables et colonnes)

Tables et colonnes à prévoir dans les prochaines migrations liées à l'Epic 13 :

- `client_handoffs` — Story 13.1, déjà planifiée.
- `client_lab_exports` — Story 13.2, nouvelle table à créer (one row par export généré).
- `activity_logs.actor_type` — ajouter la valeur `'operator_impersonation'` à la CHECK constraint.
- `client_configs.quote_accepted_at` — timestamp d'acceptation du devis.
- `client_configs.deposit_paid_at` — timestamp paiement acompte (One direct / Ponctuel).
- `client_configs.final_payment_at` — timestamp paiement final.
- `clients.client_type` — ajouter un COMMENT SQL précisant "étiquette informationnelle historique, ne pilote plus la logique".

---

## Les 3 types de clients (historiques)

Les valeurs `'complet' | 'direct_one' | 'ponctuel'` de `clients.client_type` deviennent des **étiquettes informationnelles historiques**. Elles continuent d'exister dans la base pour le reporting commercial et la segmentation, mais la logique technique est désormais pilotée par :

- `client_configs.dashboard_type` — `'lab'` ou `'one'`.
- `client_configs.active_modules` — liste des modules activés.
- `client_configs.lab_mode_available` — toggle disponible.
- `client_configs.elio_lab_enabled` — Élio Lab actif.

Cela simplifie la logique des guards, middlewares et feature flags : on raisonne sur la configuration réelle du client, pas sur une catégorie abstraite.

---

## Stories Epic 13 à implémenter

| Story | Intitulé | Statut |
|-------|---------|--------|
| 13.1 | Kit de sortie One (provisioning Vercel + GitHub + Supabase + support 1 mois) | ready-for-dev (déjà rédigée) |
| 13.2 | Kit de sortie Lab (export ZIP + email signé) | pending (à rédiger) |
| 13.3 | Impersonation MiKL (route + JWT + banner + audit log) | pending |
| 13.4 | Tunnel paiement Pennylane → création compte Supabase + email | pending |
| 13.5 | Catalogue de modules Hub (UI activation modules au devis) | pending |

---

## Diagramme de flow

```
PROSPECT ENTRE (3 sources)
├── Webhook site form → prospect créé auto
├── Webhook Cal.com booking → prospect créé auto
└── Création manuelle Hub
    ↓
VISIO DÉCOUVERTE (Cal.com)
    ↓
MiKL propose UN des 3 chemins :
├── A. LAB (recommandé) — 199€
├── B. ONE DIRECT — 30% + 70%
└── C. PONCTUEL — 30% + 70%
    ↓
DEVIS envoyé via Pennylane (Story 11.3)
    ↓
Client SIGNE le devis
    ↓
Webhook Pennylane "facture payée" (Story 13.4)
    ↓
├── Création auth.users Supabase
├── Mot de passe temporaire
├── Email d'invitation
└── Activation accès (dashboard_type + active_modules)
    ↓
Client se connecte — forced password change
    ↓
[MiKL peut IMPERSONATE — Story 13.3]
    ↓
Utilisation quotidienne (Lab OU One)
    ↓
Si Lab : parcours → graduation → One
Si One : utilisation normale + 70% à la livraison
    ↓
Sorties possibles :
├── Arrêt Lab → Kit de sortie Lab (Story 13.2)
└── Arrêt abo One → Kit de sortie One (Story 13.1)
                    + 1 mois support gratuit
```

---

## Points ouverts à traiter à l'implémentation

1. **Magic link vs mot de passe temporaire** : trancher à l'implémentation de 13.4 — privilégier un magic link cliquable (UX plus simple, pas de stockage de mot de passe temporaire) tout en conservant la possibilité de définir un mot de passe au premier login.
2. **Stratégie de rappel acompte non payé** : définir un délai (7 jours ?) après lequel une relance automatique est envoyée au client si le devis est signé mais l'acompte non réglé.
3. **Gestion des montants partiels** : que faire si Pennylane notifie un paiement partiel qui ne correspond ni à 30%, ni à 100% ? Log + alerte MiKL, pas de création automatique de compte.
4. **Durée du JWT d'impersonation** : valider la durée max (30 minutes ? 1 heure ?) et le mécanisme de renouvellement/expiration côté serveur.

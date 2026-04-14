# Story 13.2: Vue Comptabilité client — Lab + One (devis, factures, abonnement, PDF)

Status: done

## Story

As a **client Lab ou One**,
I want **accéder à un onglet "Comptabilité" dans mon dashboard avec mes devis, factures et abonnement actif**,
so that **j'ai une visibilité complète sur ma situation financière avec MonprojetPro sans quitter mon dashboard**.

## Acceptance Criteria

**Given** un client Lab accède à l'onglet "Comptabilité"
**When** la page se charge
**Then** il voit :
- Liste de ses devis reçus (`billing_sync WHERE client_id = current AND entity_type = 'quote'`) : numéro, date, montant, statut (badge coloré)
- Liste de ses factures (`billing_sync WHERE client_id = current AND entity_type = 'invoice'`) : numéro, date, montant, statut
- Bouton "Télécharger PDF" pour chaque document (URL depuis `billing_sync.data.file_url`)
- Message teasing doux si abonnement One pas encore actif : "Votre abonnement One sera visible ici après la graduation"
- Vue lecture seule (RLS : client voit uniquement ses données)

**Given** un client One accède à l'onglet "Comptabilité"
**When** la page se charge
**Then** il voit en plus :
- Card "Mon abonnement actif" : plan actuel, montant mensuel, date prochain prélèvement
- Résumé financier : total payé (cumulé), montant en attente
- Badge statut abonnement : Actif (vert) / Suspendu (orange) / Résilié (rouge)

**Given** un client clique "Télécharger PDF"
**When** l'URL Pennylane est disponible dans `billing_sync.data.file_url`
**Then** le fichier s'ouvre dans un nouvel onglet (lien direct Pennylane)

**Given** `billing_sync.data.file_url` est absent (document non encore généré par Pennylane)
**When** le client clique sur le bouton
**Then** le bouton est désactivé avec tooltip "PDF en cours de génération"

**Given** la liste est vide (pas encore de facturation)
**When** la page se charge
**Then** état vide illustré : "Vos factures et devis apparaîtront ici"

## Tasks / Subtasks

- [x] Créer la page Comptabilité Lab
  - [x] Créer `apps/client/app/(dashboard)/modules/facturation/lab/page.tsx` — RSC
  - [x] Fetch `billing_sync` filtré par `client_id` et `entity_type IN ('quote', 'invoice')`

- [x] Créer/améliorer les composants partagés
  - [x] `packages/modules/facturation/components/documents-list.tsx` — liste unifiée devis + factures avec badges
  - [x] `packages/modules/facturation/components/subscription-card.tsx` — card abonnement actif (One uniquement)
  - [x] `packages/modules/facturation/components/pdf-download-button.tsx` — bouton avec état disabled si URL absente
  - [x] `packages/modules/facturation/components/empty-accounting.tsx` — état vide

- [x] Mettre à jour la page One existante
  - [x] `apps/client/app/(dashboard)/modules/facturation/page.tsx` — ajout SubscriptionCard

- [x] Créer les tests
  - [x] Test `documents-list.tsx` : 8 tests (liste, badges, PDF enabled/disabled, état vide, isError)
  - [x] Test `subscription-card.tsx` : 7 tests (plan, montant, date, badges statut, isError, résilié)
  - [x] Test `pdf-download-button.tsx` : 3 tests (enabled, null, undefined)

## Dev Notes

### Architecture Patterns

- **RSC + lecture directe Supabase** : pas de Server Action pour la lecture — RSC avec supabase server client
- **Pas de doublon avec Story 11.5** : cette story enrichit la vue One existante et crée la vue Lab manquante
- **Détection Lab vs One** : via `client_configs.dashboard_type` ou le contexte du layout
- **PDF URL** : déjà stockée dans `billing_sync.data.file_url` (populate par Edge Function billing-sync, Story 11.2)
- **RLS garantit l'isolation** : `billing_sync_select_owner` — aucun filtrage supplémentaire nécessaire côté app

### Source Tree

```
apps/client/app/(dashboard)/modules/facturation/
├── page.tsx                              # MODIFIER: ajouter SubscriptionCard + résumé One
└── lab/page.tsx                          # CRÉER (ou logique conditionnelle dans page.tsx)

packages/modules/facturation/
└── components/
    ├── documents-list.tsx                # CRÉER: liste unifiée devis+factures
    ├── documents-list.test.tsx           # CRÉER
    ├── subscription-card.tsx             # CRÉER
    ├── subscription-card.test.tsx        # CRÉER
    ├── pdf-download-button.tsx           # CRÉER
    ├── pdf-download-button.test.tsx      # CRÉER
    └── empty-accounting.tsx              # CRÉER
```

### Existing Code Findings

- `billing_sync` table : `entity_type` IN ('invoice', 'quote', 'subscription'), `status`, `data` JSONB
- `invoices-list.tsx` (Story 11.5) : peut servir de base — à étendre ou remplacer par `documents-list.tsx`
- `billing-summary.tsx` (Story 11.5) : réutilisable pour le résumé One
- `client_configs.dashboard_type` : 'lab' | 'one' — disponible dans le layout

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Completion Notes List

- Page Lab créée comme RSC séparée (pas de logique conditionnelle) — plus lisible
- `DocumentsList` appelle `useBillingSyncRows` deux fois (quote + invoice) et combine + trie par date décroissante via `new Date().getTime()` pour éviter les comparaisons lexicographiques instables
- `SubscriptionCard` affiche le premier abonnement actif, ou le premier disponible si aucun actif — titre dynamique selon status
- Fixes SCAN : isError géré partout, grid responsive (sm:grid-cols-3), role="list"/"status", tri de dates corrigé, casts `as` documentés, metadata Next.js ajoutée
- 18 tests (3 fichiers) : couvrent les chemins positifs, états loading, empty, error

### File List

- `packages/modules/facturation/components/pdf-download-button.tsx` (créé)
- `packages/modules/facturation/components/pdf-download-button.test.tsx` (créé)
- `packages/modules/facturation/components/empty-accounting.tsx` (créé)
- `packages/modules/facturation/components/documents-list.tsx` (créé)
- `packages/modules/facturation/components/documents-list.test.tsx` (créé)
- `packages/modules/facturation/components/subscription-card.tsx` (créé)
- `packages/modules/facturation/components/subscription-card.test.tsx` (créé)
- `packages/modules/facturation/index.ts` (modifié — exports 13.2 ajoutés)
- `apps/client/app/(dashboard)/modules/facturation/lab/page.tsx` (créé)
- `apps/client/app/(dashboard)/modules/facturation/page.tsx` (modifié — ajout SubscriptionCard)

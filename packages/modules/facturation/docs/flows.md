# Flux de Facturation — Module Facturation

## Flux 1 : Devis → Facture → Paiement

```
MiKL crée un devis (MonprojetPro Hub)
    ↓
Server Action billing-proxy.ts → POST /quotes (Pennylane API v2)
    ↓
Pennylane génère le devis (statut: draft)
    ↓
MiKL envoie le devis au client (statut: pending)
    ↓
Client reçoit le devis par email (via Pennylane)
    ↓
Client accepte le devis (statut: accepted)
    ↓ [ou]
Client refuse le devis (statut: denied)
    ↓
Edge Function billing-sync (toutes les 5 min) détecte le changement
    ↓
Table billing_sync mise à jour → Supabase Realtime → TanStack Query invalidateQueries()
    ↓
Interface MonprojetPro Hub rafraîchie automatiquement
```

## Flux 2 : Abonnement Récurrent

```
MiKL configure un abonnement (MonprojetPro Hub)
    ↓
Server Action → POST /billing_subscriptions (Pennylane)
    ↓
Pennylane génère les factures selon la périodicité (mensuel/trimestriel/annuel)
    ↓
À chaque échéance : Pennylane tente le débit CB
    ↓
[Succès] statut facture → paid
    ↓
[Échec] statut → unpaid → tentative de relance automatique
    ↓
Edge Function détecte l'échec → alerte dans MonprojetPro Hub + email relance client
```

## Flux 3 : Graduation Lab → Abonnement One

```
Client finalise le parcours Lab (Epic 9)
    ↓
MiKL active la graduation → instance One créée
    ↓
pending_billing_update = true dans client_configs
    ↓
Edge Function billing-sync détecte pending_billing_update
    ↓
Création automatique du customer Pennylane (si pas encore créé)
    ↓
Création de l'abonnement initial selon le tier choisi (essentiel/agentique)
    ↓
pending_billing_update = false
```

## Flux 4 : Export RGPD / Résiliation

```
Client demande la résiliation (MonprojetPro Hub)
    ↓
Vérification des factures en attente
    ↓
Arrêt de l'abonnement Pennylane (PUT /billing_subscriptions/{id} → stopped)
    ↓
Export données client (Story 9.5a)
    ↓
Anonymisation après délai légal (Story 9.5c)
```

## Flux 5 : Avoir (Note de Crédit)

```
MiKL identifie une facture à corriger
    ↓
Création d'un avoir dans Pennylane (annule partiellement ou totalement la facture)
    ↓
Edge Function détecte le nouvel avoir
    ↓
billing_sync mis à jour → visible dans MonprojetPro Hub et MonprojetPro One
```

## États des entités

### Devis (Quote)
| État | Description |
|------|-------------|
| `draft` | Créé mais non envoyé |
| `pending` | Envoyé au client, en attente de réponse |
| `accepted` | Client a accepté |
| `denied` | Client a refusé |

### Facture (Invoice)
| État | Description |
|------|-------------|
| `draft` | Créée mais non finalisée |
| `pending` | Finalisée, paiement attendu |
| `paid` | Paiement reçu |
| `unpaid` | Délai dépassé, non payée |

### Abonnement (Subscription)
| État | Description |
|------|-------------|
| `active` | Abonnement en cours |
| `stopped` | Arrêté manuellement |
| `finished` | Terminé selon durée prévue |

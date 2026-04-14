# Notes d'intégration Orpheus

> Ce fichier centralise toutes les informations concernant Orpheus relevées durant la conception de FOXEO.
> À utiliser lors de la configuration/mise à jour d'Orpheus.

---

## Contexte

**Orpheus** = Agent IA dans Cursor/BMAD projects (développement)
**Élio Hub/Lab/One** = Agents IA dans les dashboards FOXEO (interface client)

Orpheus reste dans l'environnement de développement. Il ne communique PAS directement avec les clients.

---

## Flux de communication Orpheus → Client

```
Orpheus (dev)
    ↓ génère contenu significatif (screenshot, maquette, avancée)
    ↓
Élio Hub (dashboard MiKL)
    ↓ MiKL valide/modifie
    ↓
Élio One (dashboard client)
    ↓ transmet au client
Client reçoit mise à jour projet
```

**Règle** : Aucune communication Orpheus → Client sans validation MiKL.

---

## Intégrations à prévoir

### 1. Génération de contenu projet
Quand Orpheus crée quelque chose de significatif :
- Screenshot d'avancement
- Document (brief, specs, etc.)
- Modèle Excalidraw
- Maquette/wireframe
- Code déployable

**Action Orpheus** : Générer un "paquet de mise à jour" contenant :
- Type de contenu
- Description courte
- Fichier(s) attaché(s)
- Suggestion de message client

**Destination** : File d'attente Élio Hub pour validation MiKL.

### 2. Facturation projet (via Pennylane)
Orpheus détermine la facturation pour un projet client :
- Prestations réalisées
- Tarifs appliqués (TJM 550€, coefficients urgence/complexité)
- Éléments à facturer

**Format de sortie** :
- Document structuré (JSON ou Markdown)
- OU prompt texte avec toutes les infos

**Destination** : Élio Hub → Page "Nouveau Devis" qui met en forme automatiquement.
Le devis est ensuite créé dans **Pennylane** via `POST /api/external/v2/quotes` (Server Action proxy).
La facture est gérée entièrement par Pennylane (création, envoi email, PDF, réconciliation paiement).

**Note** : Pennylane remplace Invoice Ninja (décision 11/02/2026). Pas de webhooks Pennylane disponibles — synchronisation par polling Edge Function cron 5min.

### 3. Suivi projet (Timeline ONE)
Orpheus doit pouvoir alimenter la timeline de suivi projet visible par le client dans FOXEO-ONE.

**Événements à remonter** :
- Étape démarrée
- Étape terminée
- Livrable disponible
- Demande de validation

**Format** :
```json
{
  "type": "project_update",
  "client_id": "xxx",
  "event": "milestone_completed",
  "title": "Logo V2 terminé",
  "description": "Déclinaisons couleurs prêtes",
  "attachments": ["logo-v2.png", "declinaisons.pdf"],
  "suggested_message": "Ton logo est prêt ! Jette un œil aux déclinaisons.",
  "requires_validation": true
}
```

---

## Configuration Orpheus requise

### Variables d'environnement
```
FOXEO_HUB_API_URL=https://api.monprojetpro-hub.com
FOXEO_HUB_API_KEY=xxx
ELIO_HUB_WEBHOOK=https://api.monprojetpro-hub.com/webhooks/orpheus
```

### Commandes Orpheus à implémenter
| Commande | Description |
|----------|-------------|
| `/monprojetpro-update` | Envoyer mise à jour projet vers Élio Hub |
| `/monprojetpro-invoice` | Générer données facturation |
| `/monprojetpro-timeline` | Ajouter événement timeline client |
| `/monprojetpro-status` | Vérifier statut file d'attente |

### Règles de comportement
1. **Jamais de contact direct client** - Tout passe par Élio Hub
2. **Validation MiKL obligatoire** - Sauf configuration explicite contraire
3. **Format standardisé** - JSON pour l'interopérabilité
4. **Traçabilité** - Logger toutes les communications vers FOXEO

---

## Points en attente de décision

- [ ] Définir le format exact du "paquet de mise à jour"
- [ ] API REST ou WebSocket pour la communication ?
- [ ] Fréquence max des mises à jour (éviter spam)
- [ ] Gestion des erreurs si Élio Hub indisponible
- [ ] Authentification Orpheus → FOXEO (JWT ? API Key ?)

---

## Notes diverses

*Ajouter ici toute note concernant Orpheus au fil du projet*

- (2026-02-03) Orpheus doit pouvoir générer des données de facturation transmissibles à Élio Hub pour création automatique de factures
- (2026-02-03) Le suivi projet ONE sera alimenté par Orpheus via Élio Hub avec validation MiKL systématique
- (2026-02-11) **PIVOT FACTURATION** : Invoice Ninja remplacé par Pennylane API v2 (SaaS). Raisons : conformité facturation électronique obligatoire sept. 2026, expert-comptable MiKL utilise Pennylane, API plus riche (compta, FEC, balance, abonnements). Le flux Orpheus → Élio Hub reste identique, seul l'adaptateur API change (billing-proxy.ts → Pennylane au lieu d'Invoice Ninja). Paiements : Stripe connecté à Pennylane + virement IBAN + SEPA optionnel. Pas de webhooks Pennylane → polling intelligent Edge Function cron 5min.

---

*Dernière mise à jour : 2026-02-11*

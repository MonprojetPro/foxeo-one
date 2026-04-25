/**
 * Cartographie des routes du dashboard One pour le system prompt Élio.
 * Injectée dans le prompt One pour guider le client dans sa navigation.
 * Story 8.7 — Task 5 (AC3, FR46)
 */
export const ONE_NAVIGATION_MAP = `
# Modules et routes du dashboard One

## Dashboard principal
- **Accueil** : / → Vue d'ensemble personnalisée, actions rapides, métriques clés de l'activité

## Modules de communication
- **Chat** : /modules/chat → Messagerie directe avec MiKL (messages en temps réel, historique complet)
- **Visio** : /modules/visio → Visioconférences Google Meet, réservation de créneaux, historique des réunions
- **Élio** : /modules/elio → Interface complète de conversation avec l'assistant IA (historique toutes conversations)

## Modules de gestion
- **Documents** : /modules/documents → Stockage de fichiers, livrables partagés par MiKL, upload de documents
- **Facturation / Comptabilité** : /modules/facturation → Devis, factures, abonnement actif, suivi des paiements

## Aide & support
- **Support** : /modules/support → FAQ, signalement de problèmes, suivi des tickets, contact MiKL

**Note importante** : Si un module n'est pas visible dans la navigation à gauche, il n'est pas encore activé pour ce client. Le client peut demander à MiKL de l'activer.
`.trim()

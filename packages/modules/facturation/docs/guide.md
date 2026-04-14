# Guide Utilisateur — Module Facturation

## Vue d'ensemble

Le module Facturation de MonprojetPro Hub vous permet de gérer l'intégralité de la facturation de vos clients depuis une interface unifiée, connectée à Pennylane (votre outil de comptabilité).

## Fonctionnalités

### Devis
- Créer et envoyer des devis à vos clients directement depuis MonprojetPro Hub
- Suivre l'état des devis : brouillon → envoyé → accepté / refusé
- Convertir un devis accepté en facture en un clic

### Factures
- Visualiser toutes les factures générées (depuis devis ou manuellement)
- Suivre les paiements : en attente, payé, impayé
- Accéder aux PDF des factures

### Abonnements récurrents
- Configurer des abonnements mensuels / trimestriels / annuels pour vos clients One
- Gérer les échecs de paiement avec relances automatiques
- Modifier ou arrêter un abonnement à tout moment

### Vue financière globale
- MRR (Monthly Recurring Revenue) en temps réel
- Chiffre d'affaires mensuel et annuel
- Taux de recouvrement

## Connexion Pennylane

Toutes les données de facturation sont synchronisées avec Pennylane toutes les 5 minutes via une Edge Function. Les données sont accessibles dans MonprojetPro sans quitter l'interface.

> **Note :** Le token API Pennylane est configuré dans les variables d'environnement serveur. Il n'est jamais exposé côté client.

## Workflow typique

1. Client accepte un devis en Lab → graduation vers One
2. MiKL crée un devis dans MonprojetPro Hub (Story 11.3)
3. Client reçoit le devis par email (via Pennylane)
4. Client accepte → facture générée automatiquement
5. Paiement reçu → statut mis à jour dans Pennylane → synchronisé dans MonprojetPro

## FAQ rapide

Voir [faq.md](./faq.md) pour les questions fréquentes.

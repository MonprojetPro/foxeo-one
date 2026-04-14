# FAQ — Module Facturation

## Général

**Q : Mes données Pennylane sont-elles synchronisées en temps réel ?**
R : Les données sont synchronisées toutes les 5 minutes via une Edge Function. En cas de modification urgente, un bouton de synchronisation manuelle est disponible.

**Q : Puis-je utiliser MonprojetPro sans avoir un compte Pennylane ?**
R : Non. Le module Facturation nécessite un compte Pennylane actif et un token API configuré par MiKL.

**Q : Les clients voient-ils leurs factures dans MonprojetPro One ?**
R : Oui, les clients One peuvent consulter leur historique de facturation dans leur dashboard (Story 11.5).

## Devis

**Q : Un devis peut-il être modifié après envoi ?**
R : Non. Un devis envoyé ne peut pas être modifié directement. Il faut l'annuler et en créer un nouveau.

**Q : Quelle est la durée de validité d'un devis ?**
R : La durée de validité est configurée dans Pennylane (par défaut 30 jours). Elle est visible dans l'interface.

## Factures

**Q : Comment gérer une facture impayée ?**
R : Les relances sont gérées automatiquement par Pennylane selon les règles configurées. Une alerte apparaît dans MonprojetPro Hub (Story 11.4).

**Q : Puis-je émettre un avoir (note de crédit) ?**
R : Oui, depuis la vue détaillée d'une facture dans MonprojetPro Hub (Story 11.5).

## Abonnements

**Q : Que se passe-t-il si le paiement d'un abonnement échoue ?**
R : Pennylane effectue des tentatives de recouvrement automatiques. MonprojetPro Hub reçoit une alerte et peut envoyer un email de relance personnalisé au client (Story 11.4).

**Q : Comment changer le montant d'un abonnement ?**
R : Arrêter l'abonnement actuel et en créer un nouveau avec le nouveau montant.

## Technique

**Q : Le token API Pennylane est-il sécurisé ?**
R : Oui. Le token est stocké dans les variables d'environnement serveur (Supabase secrets / Vercel env vars) et n'est jamais exposé côté client.

**Q : Quelle est la limite de débit de l'API Pennylane ?**
R : 25 requêtes par 5 secondes. Le client HTTP de MonprojetPro gère automatiquement les limites de débit avec un backoff exponentiel.

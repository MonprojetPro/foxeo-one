/**
 * Documentation des fonctionnalités Hub pour Élio.
 * Injecté dans le system prompt Hub pour aider MiKL à naviguer.
 */
export const HUB_FEATURES_DOCUMENTATION = `
# Fonctionnalités Hub disponibles

## Gestion clients (/modules/crm)
- **Créer un client** : Va dans "Clients" → Clic sur "Nouveau client"
- **Voir la liste des clients** : "Clients" dans le menu principal
- **Fiche client complète** : Clic sur un client dans la liste
- **Modifier un client** : Fiche client → Bouton "Modifier"
- **Suspendre / Réactiver** : Fiche client → Onglet "Actions"
- **Clôturer un client** : Fiche client → Actions → "Clôturer"

## Validation Hub (/modules/validation-hub)
- **Voir les demandes en attente** : "Validation Hub" dans le menu
- **Traiter une demande** : Clic sur une demande → Boutons Valider/Refuser/Demander précisions
- **Compter les demandes** : Badge sur l'icône Validation Hub (temps réel)

## Communication
- **Chat avec un client** : Fiche client → Onglet "Messages" OU "Chat" dans le menu (/modules/chat)
- **Visio avec un client** : "Visio" dans le menu (/modules/visio) → Démarrer une salle
- **Voir l'historique visio** : "Visio" → Onglet "Historique"

## Documents (/modules/documents)
- **Partager un document** : "Documents" → Upload → Partager avec client
- **Voir les documents d'un client** : Fiche client → Onglet "Documents"

## Analytics (/modules/analytics)
- **Statistiques globales** : "Analytics" dans le menu
- **Temps passé par client** : Analytics → Onglet "Temps passé"

## Administration
- **Logs d'activité** : "Admin" → "Logs"
- **Mode maintenance** : "Admin" → "Système" → Toggle maintenance
- **Surveiller les instances** : "Admin" → "Instances"
`.trim()

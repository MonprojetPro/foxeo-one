/**
 * Cartographie des routes du dashboard One pour le system prompt Élio.
 * Injectée dans le prompt One pour guider le client dans sa navigation.
 * Story 8.7 — Task 5 (AC3, FR46)
 */
export const ONE_NAVIGATION_MAP = `
# Modules et routes du dashboard One

## Dashboard principal
- **Accueil** : / → Vue d'ensemble, actions rapides, statistiques clés

## Modules de base (toujours actifs)
- **Profil** : /profil → Vos informations personnelles, préférences, sécurité
- **Documents** : /modules/documents → Vos documents, livrables Lab, fichiers partagés par MiKL
- **Support** : /support → Aide, signalement d'un problème, contact MiKL

## Modules optionnels (selon votre configuration)
- **Calendrier / Agenda** : /modules/agenda → Événements, réservations, planification
- **Membres** : /modules/membres → Gestion des membres (associations, équipes)
- **Facturation** : /modules/facturation → Factures, devis, suivi des paiements
- **SMS** : /modules/sms → Envoi de SMS groupés à vos contacts
- **Présences** : /modules/presences → Feuilles d'émargement (cours, formations, ateliers)
- **Élio** : /modules/elio → Votre assistant IA (vous êtes ici)

**Note importante** : Si un module n'est pas visible dans votre navigation, il n'est pas encore activé. Vous pouvez demander à MiKL de l'activer pour vous.
`.trim()

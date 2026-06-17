/**
 * Cartographie du dashboard One pour le system prompt Élio.
 * Injectée dans le prompt One pour guider le client dans sa navigation.
 *
 * ⚠️ Élio parle au client en NOMS D'ONGLETS (tels qu'affichés dans le menu de gauche),
 * JAMAIS en adresses techniques (« /modules/… ») — ça fait geek et ce n'est pas intuitif.
 *
 * Source de vérité : libellés des manifests des modules One.
 * Story 8.7 — Task 5 (AC3, FR46)
 */
export const ONE_NAVIGATION_MAP = `
# Navigation du dashboard One

RÈGLE ABSOLUE : réfère-toi TOUJOURS aux onglets tels que le client les voit dans le menu de gauche (ex. « dans votre onglet Documents », « depuis votre Tableau de bord »). Ne donne JAMAIS d'adresse technique ni d'URL (un chemin avec des barres obliques) : c'est incompréhensible et ça fait geek pour le client.

## Les onglets du menu de gauche
- **Tableau de bord** : la page d'accueil — vue d'ensemble, actions rapides, métriques clés de l'activité.
- **Chat MiKL** : messagerie directe avec MiKL (messages en temps réel, historique complet).
- **Visio** : visioconférences avec MiKL — réserver un créneau, rejoindre, consulter l'historique.
- **Chat Élio** : la conversation complète avec l'assistant IA (historique de toutes vos conversations).
- **Documents** : fichiers et livrables partagés avec MiKL, dépôt de documents.
- **Comptabilité** : devis, factures, abonnement, suivi des paiements.
- **CRM** : gestion de vos contacts et de vos clients.
- **Support** : aide, FAQ, signalement d'un problème, suivi des demandes.

Onglets optionnels (selon l'abonnement) : **Agenda**, **Membres**, **SMS**, **Présences**.

**Note importante** : si un onglet n'apparaît pas dans le menu de gauche, le module n'est pas encore activé pour ce client. Il peut demander à MiKL de l'activer.
`.trim()

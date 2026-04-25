/**
 * Registre statique des documentations modules pour Élio.
 * Embarqué dans le bundle Next.js → disponible en production Vercel.
 *
 * Contenu : résumé client-friendly de chaque module (guide + FAQ condensée).
 * Mise à jour : à chaque évolution significative d'un module.
 */

export const MODULE_DOCS: Record<string, string> = {
  'core-dashboard': `
## Dashboard Accueil (/)
Page d'accueil personnalisée du dashboard One.
Affiche les métriques clés, les actions rapides, et un aperçu de l'activité récente.
Depuis l'accueil, tu peux accéder à tous tes modules via la sidebar à gauche.
`.trim(),

  'chat': `
## Module Chat (/modules/chat)
Messagerie directe avec MiKL (ton opérateur).
Tu peux envoyer des messages texte à MiKL et recevoir ses réponses en temps réel.
Toutes les conversations sont archivées et consultables à tout moment.
**Comment l'utiliser :** Clique sur "Chat" dans la navigation → écris ton message → appuie sur Entrée ou le bouton Envoyer.
**Quand l'utiliser :** Pour poser une question urgente à MiKL, partager un document, ou signaler un besoin.
`.trim(),

  'documents': `
## Module Documents (/modules/documents)
Espace de stockage et de partage de fichiers entre toi et MiKL.
Tu peux consulter les documents que MiKL a partagés avec toi (livrables, contrats, ressources),
et uploader tes propres fichiers (PDF, Word, Excel, images, etc.).

**Fonctionnalités :**
- Uploader un document : bouton "Ajouter" ou glisser-déposer
- Organiser en dossiers : créer des dossiers pour classer tes fichiers
- Rechercher : barre de recherche filtre par nom, type, tags
- Télécharger / Visualiser : cliquer sur un document pour l'ouvrir en aperçu

**Limite :** 10 Mo par fichier. Types acceptés : PDF, Word, Excel, images, Markdown, CSV.
`.trim(),

  'visio': `
## Module Visio (/modules/visio)
Planification et accès à tes visioconférences avec MiKL via Google Meet.

**Ce que tu peux faire :**
- Voir ton prochain meeting planifié avec la date et l'heure
- Réserver un créneau via le calendrier intégré (Cal.com)
- Rejoindre un meeting : cliquer "Rejoindre sur Google Meet" → s'ouvre dans un nouvel onglet
- Consulter l'historique de tes réunions passées avec enregistrements et transcriptions

**Note :** Les meetings sont planifiés par MiKL. Si tu souhaites en planifier un, utilise le bouton de réservation de créneau ou contacte MiKL via le Chat.
`.trim(),

  'facturation': `
## Module Facturation / Comptabilité (/modules/facturation)
Accès à tous tes documents financiers liés à ton abonnement MonprojetPro.

**Ce que tu peux consulter :**
- **Ton abonnement actif** : type, montant, prochaine échéance
- **Résumé financier** : montants payés, en attente, historique
- **Devis** : devis envoyés par MiKL avec leur statut (en attente, accepté, refusé)
- **Factures** : toutes tes factures avec possibilité de télécharger les PDF

**Note :** Ce module est en lecture seule. Pour demander un devis ou modifier ton abonnement, contacte MiKL via le Chat.
`.trim(),

  'support': `
## Module Support (/modules/support)
Centre d'aide et de contact avec MiKL.

**Deux onglets disponibles :**

**Aide & FAQ :** Base de connaissances avec des réponses aux questions fréquentes, organisées par catégories. Barre de recherche disponible. En bas de page, boutons pour contacter MiKL via Chat ou signaler un problème.

**Mes signalements :** Liste de tous tes tickets de support avec leur statut (Ouvert, En cours, Résolu, Fermé).

**Comment signaler un problème :**
1. Aller dans Support > onglet "Aide & FAQ"
2. Cliquer "Signaler un problème" en bas de page
3. Choisir le type (Bug, Question, Suggestion)
4. Remplir le sujet et la description
5. Optionnel : joindre une capture d'écran
6. Soumettre → MiKL reçoit une notification

**Pour contacter MiKL directement :** utiliser le module Chat ou le bouton "Contacter MiKL" dans la FAQ.
`.trim(),

  'elio': `
## Module Élio (/modules/elio)
Interface complète de conversation avec Élio, ton assistant IA MonprojetPro.
(Tu es actuellement en train de parler avec moi ici !)

**Fonctionnalités de la page Élio :**
- Historique complet de toutes tes conversations
- Possibilité de créer une nouvelle conversation
- Basculer entre les conversations passées
- Modes : Question libre, Brouillon (génération de texte), Aide dashboard

**Note :** Le widget Élio dans la sidebar (en bas à gauche) permet des questions rapides sans quitter la page en cours. Il est connecté à la page Élio — les conversations y sont visibles.
`.trim(),
}

/**
 * Retourne la documentation d'un module donné, ou null si non trouvé.
 */
export function getModuleDoc(moduleId: string): string | null {
  return MODULE_DOCS[moduleId] ?? null
}

/**
 * Retourne la documentation de plusieurs modules concatenée.
 */
export function getModulesDocs(moduleIds: string[]): string | null {
  const sections = moduleIds
    .map((id) => MODULE_DOCS[id])
    .filter(Boolean)

  return sections.length > 0 ? sections.join('\n\n') : null
}

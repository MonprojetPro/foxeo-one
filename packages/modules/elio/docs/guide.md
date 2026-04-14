# Guide — Module Élio

## Vue d'ensemble

Élio est l'assistant IA personnel intégré au parcours MonprojetPro. Il adapte ses réponses selon le profil de communication de chaque client.

## Fonctionnalités Story 6.4

### Profil de communication
Élio peut être personnalisé selon 4 dimensions :
- **Ton** : formal, casual, technique, amical
- **Longueur des réponses** : concises, détaillées, équilibrées
- **Style d'interaction** : directif, exploratif, collaboratif
- **Préférences contexte** : exemples concrets, théorie, mix

### Dialog de personnalisation initiale
Au premier usage, un dialog guide le client pour configurer son profil Élio en 4 questions rapides. Le skip est possible → valeurs par défaut appliquées.

### Suggestions guidées
Des suggestions contextuelles (chips) sont affichées selon l'étape du parcours en cours. Un clic remplit et envoie le message.

### Modification du profil
Le profil est modifiable à tout moment dans **Paramètres > Profil de communication Élio**.

## Fonctionnalités Story 6.5

### Génération de briefs
Élio peut générer automatiquement le brief d'une étape à partir du contexte de conversation. Le client peut relire, modifier, régénérer et soumettre le brief.

**Conditions d'activation** : étape `current` avec `validation_required = TRUE`.

### Workflow de génération
1. Client clique "Générer mon brief avec Élio" (sur la page de soumission d'étape)
2. Élio appelle l'API Claude avec le contexte conversation + template étape + profil
3. Dialog affiche le brief généré en markdown
4. Client peut : éditer (textarea), régénérer, ou soumettre pour validation
5. Soumission → flow identique Story 6.3 : notification MiKL + étape → `pending_validation`

### Notes techniques
- Conversation context : table `elio_conversations` (Story 8.2) — fallback gracieux si absente
- Max 20 messages de conversation chargés pour limiter les tokens
- Clé API Anthropic : côté serveur uniquement (`ANTHROPIC_API_KEY`)
- Logging : `[ELIO:GENERATE_BRIEF]`, `[ELIO:SUBMIT_BRIEF]`

## Fonctionnalités Story 8.1 — Infrastructure unifiée

### Architecture multi-dashboard
Élio supporte maintenant 3 dashboards (`hub`, `lab`, `one`) via un composant unifié `elio-chat.tsx`.
Le `dashboardType` détermine la palette de couleurs, le system prompt et les capacités disponibles.

### Composants partagés
- `ElioChat` : composant de chat principal (dashboard-agnostic)
- `ElioThinking` : indicateur animé "Élio réfléchit..." (FR122)
- `ElioErrorMessage` : bulle d'erreur avec bouton "Réessayer" (FR83)
- `ElioMessageItem` : bulle de message utilisateur ou assistant

### Hooks
- `useElioChat` : état de la conversation, envoi, retry, gestion erreurs
- `useElioConfig` : config Élio par dashboard (TanStack Query, 5min cache)

### Gestion des erreurs (FR83, NFR-I2)
4 types d'erreurs gérés : TIMEOUT (60s), NETWORK_ERROR, LLM_ERROR, UNKNOWN.
Chaque erreur affiche un message clair et un bouton "Réessayer".

### System prompts multi-dashboard
`config/system-prompts.ts` construit le prompt adapté au `dashboardType` avec le profil de communication du client.

## Architecture

- `types/communication-profile.types.ts` — Types TypeScript
- `actions/create-communication-profile.ts` — Server Action création
- `actions/update-communication-profile.ts` — Server Action mise à jour
- `actions/get-communication-profile.ts` — Server Action lecture
- `actions/generate-brief.ts` — Server Action génération brief via API Claude
- `actions/submit-elio-brief.ts` — Server Action soumission brief généré
- `utils/build-system-prompt.ts` — Construction du prompt système Claude
- `components/personalize-elio-dialog.tsx` — Dialog personnalisation initiale
- `components/elio-guided-suggestions.tsx` — Chips suggestions étape
- `components/generated-brief-dialog.tsx` — Dialog aperçu + édition + soumission brief
- `components/elio-generate-brief-section.tsx` — Section intégrable avec bouton + dialog
- `components/brief-markdown-renderer.tsx` — Rendu markdown du brief
- `data/elio-suggestions.ts` — Données suggestions par étape

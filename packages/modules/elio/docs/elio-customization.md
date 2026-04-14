# Élio — Profil de communication

## Vue d'ensemble

Le profil de communication permet à chaque client de personnaliser la façon dont Élio répond. Il est stocké dans la table `communication_profiles` et injecté dans le system prompt à chaque appel à l'API Claude.

## Dimensions de personnalisation

| Dimension | Options | Défaut | Description |
|-----------|---------|--------|-------------|
| `preferred_tone` | `formal`, `casual`, `technical`, `friendly` | `friendly` | Registre linguistique des réponses |
| `preferred_length` | `concise`, `detailed`, `balanced` | `balanced` | Longueur des réponses |
| `interaction_style` | `directive`, `explorative`, `collaborative` | `collaborative` | Mode d'engagement |
| `context_preferences` | `{ examples, theory }` (JSONB) | `{}` | Type d'illustrations |

## Injection dans le system prompt

La fonction `buildElioSystemPrompt(profile, step?)` dans `utils/build-system-prompt.ts` génère un system prompt personnalisé basé sur le profil du client.

```typescript
import { buildElioSystemPrompt } from '@monprojetpro/module-elio'

const systemPrompt = buildElioSystemPrompt(profile, currentStep)
// → Utiliser dans l'appel API Claude
```

**Important :** Le profil n'est jamais exposé côté client. Il est traité exclusivement côté serveur.

## Sécurité (RLS)

Trois policies RLS protègent la table `communication_profiles` :
- `communication_profiles_select_owner` — Client lit son propre profil
- `communication_profiles_insert_owner` — Client crée son propre profil
- `communication_profiles_update_owner` — Client modifie son propre profil

Aucune policy de suppression — le profil est permanent et lié au client.

## Flux d'utilisation

1. **Première conversation Élio** → Vérifier si profil existe (`getCommunicationProfile`)
2. **Aucun profil** → Afficher `PersonalizeElioDialog`
3. **Skip** → Profil créé avec valeurs par défaut
4. **Envoi message** → `buildElioSystemPrompt(profile, step)` → Appel Claude

## Suggestions guidées

Les chips de suggestions sont gérées par `ElioGuidedSuggestions` et les données dans `data/elio-suggestions.ts`.
Elles sont organisées par `step_number` du parcours en cours.

Pour ajouter des suggestions pour une nouvelle étape :
```typescript
// data/elio-suggestions.ts
export const ELIO_SUGGESTIONS_BY_STEP = {
  // ... étapes existantes
  7: [
    'Ma première suggestion pour l\'étape 7',
    'Deuxième suggestion',
  ],
}
```

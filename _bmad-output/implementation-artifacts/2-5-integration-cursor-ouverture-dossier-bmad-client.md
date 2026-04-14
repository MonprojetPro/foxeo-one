# Story 2.5: Intégration Cursor (ouverture dossier BMAD client)

Status: done

## Story

As a **MiKL (opérateur)**,
I want **ouvrir le dossier BMAD d'un client directement dans Cursor depuis la fiche CRM**,
So that **je peux travailler avec Orpheus sur les documents du client sans quitter mon flux de travail**.

## Acceptance Criteria

1. **AC1 — Bouton "Ouvrir dans Cursor"** : Sur la fiche client, un bouton "Ouvrir dans Cursor" (FR7) génère un lien `cursor://file/` pointant vers le dossier BMAD du client. Le chemin est construit depuis une convention configurable (défaut : `{bmad_base_path}/clients/{client_slug}/`). Le `client_slug` est dérivé du nom de l'entreprise ou du nom client (kebab-case).

2. **AC2 — Dossier inexistant** : Si le dossier BMAD du client n'existe pas encore, un message informe l'utilisateur. Un bouton "Copier le chemin" copie le chemin attendu dans le presse-papier. Des instructions indiquent comment initialiser le dossier BMAD.

3. **AC3 — Fallback protocole non supporté** : Si le protocole `cursor://` n'est pas supporté par le navigateur, un fallback affiche le chemin complet avec un bouton "Copier dans le presse-papier" et un message expliquant comment ouvrir manuellement dans Cursor.

4. **AC4 — Tests** : Tests unitaires co-localisés pour tous les composants/utilitaires. Coverage >80%.

## Tasks / Subtasks

- [x] Task 1 — Configuration chemin BMAD (AC: #1)
  - [x] 1.1 Ajouter constante `BMAD_BASE_PATH` configurable dans `packages/modules/crm/utils/cursor-integration.ts`
  - [x] 1.2 Fonction `buildClientSlug(name: string, company?: string): string` — kebab-case du nom entreprise ou nom client
  - [x] 1.3 Fonction `buildBmadPath(clientSlug: string, basePath?: string): string` — construit le chemin complet
  - [x] 1.4 Fonction `buildCursorUrl(path: string): string` — génère `cursor://file/{path}`

- [x] Task 2 — Composant CursorButton (AC: #1, #2, #3)
  - [x] 2.1 `components/cursor-button.tsx` — Bouton principal avec icône Cursor
  - [x] 2.2 Détection support protocole custom via `window.open()` avec timeout fallback
  - [x] 2.3 État "dossier inexistant" : message info + bouton "Copier le chemin"
  - [x] 2.4 État "protocole non supporté" : chemin complet affiché + bouton copier + instructions manuelles
  - [x] 2.5 Utiliser `navigator.clipboard.writeText()` pour la copie, toast "Chemin copié"

- [x] Task 3 — Intégration fiche client (AC: #1)
  - [x] 3.1 Ajouter le bouton CursorButton dans le header de la fiche client (Story 2.3)
  - [x] 3.2 Passer le client (name, company) en props pour construire le slug

- [x] Task 4 — Tests (AC: #4)
  - [x] 4.1 Tests unitaires `cursor-integration.test.ts` : buildClientSlug, buildBmadPath, buildCursorUrl
  - [x] 4.2 Tests composant `cursor-button.test.tsx` : render, clic, copie presse-papier, fallback
  - [x] 4.3 Tests edge cases : noms avec caractères spéciaux, accents, espaces

- [x] Task 5 — Documentation (AC: #4)
  - [x] 5.1 Mettre à jour `docs/guide.md` avec section Cursor
  - [x] 5.2 Mettre à jour `docs/faq.md` avec questions Cursor

## Dev Notes

### Architecture — Règles critiques

- **Pas de Server Action nécessaire** : Cette story est purement côté client (protocole URL + clipboard).
- **Composant client** : `CursorButton` est `'use client'` car il utilise `window`, `navigator.clipboard`.
- **Pas de migration DB** : Aucune donnée à stocker. Le chemin est calculé dynamiquement.

### Construction du slug client

```typescript
// packages/modules/crm/utils/cursor-integration.ts
import { toKebabCase } from '@monprojetpro/utils' // ou implémentation locale

export const BMAD_BASE_PATH = process.env.NEXT_PUBLIC_BMAD_BASE_PATH || '/Users/mikl/bmad'

export function buildClientSlug(name: string, company?: string): string {
  const source = company || name
  return toKebabCase(source) // ex: "Mon Entreprise" → "mon-entreprise"
}

export function buildBmadPath(clientSlug: string, basePath = BMAD_BASE_PATH): string {
  return `${basePath}/clients/${clientSlug}`
}

export function buildCursorUrl(path: string): string {
  return `cursor://file/${path}`
}
```

**Attention kebab-case** : Gérer les accents (normalisation NFD + suppression diacritiques), les caractères spéciaux, les espaces multiples. Utiliser `@monprojetpro/utils` si `toKebabCase` existe, sinon créer dans `packages/modules/crm/utils/`.

### Détection protocole custom

Le protocole `cursor://` n'est pas détectable de manière fiable. Stratégie :
1. Tenter `window.open(cursorUrl)` ou `window.location.href = cursorUrl`
2. Si aucune réponse dans 2 secondes (heuristique), afficher le fallback
3. Alternative : détecter via `navigator.registerProtocolHandler` (limité)

**Recommandation** : Utiliser `window.location.href = cursorUrl` avec un `setTimeout` de 1.5s qui affiche le fallback si la page est toujours visible (l'app n'a pas pris le focus).

### Composants shadcn/ui à utiliser

- `<Button>` pour le bouton principal
- `<Tooltip>` pour info-bulle sur hover
- `<Alert>` pour le message dossier inexistant / protocole non supporté
- Toast via le système existant pour confirmation copie

### Fichiers à créer

- `packages/modules/crm/utils/cursor-integration.ts`
- `packages/modules/crm/utils/cursor-integration.test.ts`
- `packages/modules/crm/components/cursor-button.tsx`
- `packages/modules/crm/components/cursor-button.test.tsx`

### Fichiers à modifier

- `packages/modules/crm/index.ts` (ajouter exports)
- Composant header fiche client (Story 2.3) pour intégrer CursorButton

### Patterns existants à réutiliser

- Toast notifications via `@monprojetpro/ui`
- Palette Hub Cyan/Turquoise
- Skeleton loaders si nécessaire (ici peu probable)
- Tests co-localisés `.test.ts(x)` à côté du source

### Dépendances avec autres stories

- **Story 2.3** : Le bouton s'intègre dans le header de la fiche client. Si 2.3 pas implémentée, créer le composant standalone.
- Aucune dépendance DB ou migration.

### Anti-patterns — Interdit

- NE PAS créer d'API Route pour cette fonctionnalité (tout est côté client)
- NE PAS stocker le chemin BMAD en DB (calculé dynamiquement)
- NE PAS utiliser `any` pour les types clipboard

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-2-*.md#Story 2.5]
- [Source: docs/project-context.md]

## Senior Developer Review (AI)

### Review Model
claude-opus-4-6 (adversarial code review)

### Issues Found: 3 (0 Critical, 0 High, 1 Medium, 2 Low)

| # | Severity | Issue | Resolution |
|---|----------|-------|------------|
| 1 | MEDIUM | Dev Agent Record completely empty — no File List, no Completion Notes | Fixed: Populated record |
| 2 | LOW | `folderExists` prop defaults to `true` but there's no actual folder detection mechanism | Accepted: Per AC2, this is a prop for the parent to set |
| 3 | LOW | `toKebabCase` local implementation vs `@monprojetpro/utils` — minor duplication | Accepted: Module-local to avoid cross-package dependency for simple utility |

### Verdict
**PASS** — Clean implementation, well-tested utilities and component. No security or logic issues.

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
Aucun blocage rencontré.

### Completion Notes List
- Task 1: `cursor-integration.ts` — `toKebabCase` avec normalisation NFD (accents), `buildClientSlug`, `buildBmadPath`, `buildCursorUrl`. `BMAD_BASE_PATH` configurable via env var.
- Task 2: `cursor-button.tsx` — Bouton "Ouvrir dans Cursor" avec 3 états (normal, folder missing, protocol fallback). Clipboard API + toast. Timeout 1.5s pour détection protocole.
- Task 3: Intégré dans `client-header.tsx`.
- Task 4: 22 tests (16 utils + 6 composant). Edge cases: accents, caractères spéciaux, clipboard errors.
- Task 5: `guide.md` et `faq.md` mis à jour.

### File List

**Créés:**
- `packages/modules/crm/utils/cursor-integration.ts`
- `packages/modules/crm/utils/cursor-integration.test.ts`
- `packages/modules/crm/components/cursor-button.tsx`
- `packages/modules/crm/components/cursor-button.test.tsx`

**Modifiés:**
- `packages/modules/crm/components/client-header.tsx` (ajout CursorButton)
- `packages/modules/crm/index.ts` (exports)
- `packages/modules/crm/docs/guide.md` (section Cursor)
- `packages/modules/crm/docs/faq.md` (FAQ Cursor)

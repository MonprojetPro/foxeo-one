# Story 2.2: Création & édition de fiche client

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **MiKL (opérateur)**,
I want **créer et modifier une fiche client avec toutes les informations de base et définir son type**,
so that **chaque nouveau client est enregistré dans mon portefeuille avec les données nécessaires à son suivi**.

## Acceptance Criteria

**Given** MiKL sur la page liste clients ou la fiche client
**When** il clique sur "Créer un client" (bouton CTA)
**Then** un formulaire de création s'affiche (dialog modal ou page dédiée)
**And** le formulaire contient les champs : nom (obligatoire), email (obligatoire, unique par opérateur), entreprise, téléphone, secteur d'activité, type de client (Complet / Direct One / Ponctuel, obligatoire, défaut: Ponctuel) (FR1, FR2)
**And** le formulaire utilise react-hook-form avec validation Zod
**And** les schemas de validation sont dans @monprojetpro/utils/validation-schemas.ts

**Given** MiKL remplit le formulaire de création
**When** il soumet le formulaire avec des données valides
**Then** une Server Action `createClient()` est exécutée
**And** la réponse suit le pattern `{ data, error }` (jamais de throw)
**And** un enregistrement est créé dans la table `clients` avec `operator_id` = MiKL
**And** un enregistrement `client_configs` est créé avec les modules par défaut (`['core-dashboard']`)
**And** un toast de confirmation s'affiche ("Client créé avec succès")
**And** le cache TanStack Query `['clients', operatorId]` est invalidé
**And** MiKL est redirigé vers la fiche du nouveau client

**Given** MiKL sur la fiche d'un client existant
**When** il clique sur "Modifier"
**Then** le formulaire d'édition s'affiche, prérempli avec les données actuelles
**And** il peut modifier tous les champs y compris le type de client (FR2)

**Given** MiKL soumet le formulaire d'édition avec des données valides
**When** la Server Action `updateClient()` s'exécute
**Then** la fiche est mise à jour en base
**And** un toast de confirmation s'affiche ("Client mis à jour")
**And** le cache TanStack Query est invalidé pour la liste et la fiche

**Given** MiKL soumet un formulaire avec un email déjà utilisé par un autre client du même opérateur
**When** la validation échoue
**Then** un message d'erreur clair s'affiche à côté du champ email ("Cet email est déjà associé à un client")

**Given** MiKL tente de créer un client
**When** une erreur serveur survient
**Then** un toast d'erreur s'affiche avec un message explicite (FR82)
**And** le formulaire reste affiché avec les données saisies (pas de perte de données)

## Tasks / Subtasks

- [x] Définir le schema de validation Zod (AC: #1)
  - [x] Ajouter `createClientSchema` dans `@monprojetpro/utils/validation-schemas.ts`
  - [x] Champs: `name` (string, min 2, max 100), `email` (email format, unique par operator), `company` (string, optionnel), `phone` (string, optionnel), `sector` (string, optionnel), `clientType` (enum: 'complet', 'direct-one', 'ponctuel', défaut: 'ponctuel')
  - [x] Ajouter `updateClientSchema` (même structure, tous champs optionnels sauf id)
  - [x] Messages d'erreur français personnalisés

- [x] Créer les types TypeScript (AC: #1)
  - [x] Ajouter dans `packages/modules/crm/types/crm.types.ts`:
    - `CreateClientInput` (infer du schema Zod)
    - `UpdateClientInput` (infer du schema Zod)
    - `ClientType` enum ('complet' | 'direct-one' | 'ponctuel')

- [x] Créer le composant formulaire (AC: #1, #3)
  - [x] Créer `packages/modules/crm/components/client-form.tsx`
  - [x] Utiliser react-hook-form avec `zodResolver(createClientSchema)`
  - [x] Mode création: tous champs vides, `clientType` défaut 'ponctuel'
  - [x] Mode édition: préremplir avec données client existant via prop `defaultValues`
  - [x] Champs: Input nom, Input email, Input entreprise, Input téléphone, Input secteur, RadioGroup type client
  - [x] Boutons: "Annuler" (ferme dialog/retour), "Créer" ou "Enregistrer" (submit)
  - [x] Afficher erreurs de validation sous chaque champ

- [x] Créer le dialog modal de création (AC: #1)
  - [x] Créer `packages/modules/crm/components/create-client-dialog.tsx`
  - [x] Utiliser `Dialog` de @monprojetpro/ui avec trigger bouton "Créer un client"
  - [x] Intégrer `ClientForm` en mode création
  - [x] Fermer dialog après création réussie
  - [x] Gérer état `isPending` du formulaire (disabled pendant submit)

- [x] Créer la Server Action `createClient` (AC: #2)
  - [x] Créer `packages/modules/crm/actions/create-client.ts`
  - [x] Signature: `createClient(input: CreateClientInput): Promise<ActionResponse<Client>>`
  - [x] Valider input avec `createClientSchema.safeParse()`
  - [x] Si invalide: retourner `{ data: null, error: { message, code: 'VALIDATION_ERROR' } }`
  - [x] Vérifier unicité email par operator (query `clients` where `operator_id` and `email`)
  - [x] Si email existe: retourner `{ data: null, error: { message: 'Email déjà utilisé', code: 'EMAIL_ALREADY_EXISTS' } }`
  - [x] Créer client dans table `clients` avec `operator_id` du user authentifié
  - [x] Créer config dans table `client_configs` avec `active_modules: ['core-dashboard']`, `dashboard_type: 'one'` par défaut
  - [x] Transformer snake_case → camelCase avant retour
  - [x] Retourner `{ data: client, error: null }`
  - [x] Gérer erreurs DB: `{ data: null, error: { message: 'Erreur lors de la création', code: 'DB_ERROR' } }`

- [x] Créer la Server Action `updateClient` (AC: #4)
  - [x] Créer `packages/modules/crm/actions/update-client.ts`
  - [x] Signature: `updateClient(clientId: string, input: UpdateClientInput): Promise<ActionResponse<Client>>`
  - [x] Valider input avec `updateClientSchema.safeParse()`
  - [x] Vérifier ownership: client appartient à l'operator authentifié (RLS gère, double check côté action)
  - [x] Si email modifié: vérifier unicité (même logique que createClient, avec neq sur id)
  - [x] Update table `clients` avec nouvelles données
  - [x] Retourner format `{ data, error }`

- [x] Intégrer le formulaire dans la liste clients (AC: #1)
  - [x] Ajouter bouton "Créer un client" dans header de `client-list.tsx`
  - [x] Utiliser `CreateClientDialog` component
  - [x] Invalider cache TanStack Query après création: `queryClient.invalidateQueries(['clients'])`

- [x] Créer la page/section édition (AC: #3)
  - [x] Créer `EditClientDialog` composant réutilisable (client-details.tsx sera créé en Story 2.3)
  - [x] Dialog avec `ClientForm` en mode édition
  - [x] Passe `defaultValues` depuis data client
  - [x] Invalide cache après update: `queryClient.invalidateQueries(['client', clientId])` et `['clients']`

- [x] Implémenter la gestion des erreurs (AC: #5, #6)
  - [x] Dans `ClientForm`: afficher erreurs de validation inline sous champs
  - [x] Toast d'erreur via `showError()` de @monprojetpro/ui si erreur serveur
  - [x] Message spécifique pour email dupliqué: afficher à côté du champ email
  - [x] Conserver état formulaire en cas d'erreur (pas de reset)
  - [x] Log errors côté serveur avec format `[CRM:CREATE]` / `[CRM:UPDATE]`

- [x] Implémenter la navigation post-création (AC: #2)
  - [x] Après création réussie, utiliser `router.push('/modules/crm/clients/' + clientId)`
  - [x] Toast success: "Client créé avec succès"
  - [x] Fermer dialog avant navigation

- [x] Tests unitaires et d'intégration (AC: tous)
  - [x] Créer `packages/modules/crm/components/client-form.test.tsx` (11 tests)
    - Test validation: champs requis, format email, longueur nom
    - Test soumission: appel action avec bonnes données
    - Test mode création vs édition
  - [x] Créer `packages/modules/crm/actions/create-client.test.ts` (6 tests)
    - Test validation Zod
    - Test unicité email par operator
    - Test création client + client_configs
    - Test format retour `{ data, error }`
  - [x] Créer `packages/modules/crm/actions/update-client.test.ts` (7 tests)
    - Test update fields
    - Test ownership (via RLS mock)
    - Test email uniqueness
  - [x] Créer `packages/modules/crm/components/create-client-dialog.test.tsx` (2 tests)
  - [x] Tests validation-schemas: 17 nouveaux tests pour createClientSchema et updateClientSchema
  - [ ] Test e2e (Playwright): flux complet création → redirection → affichage fiche (différé — nécessite infra Supabase)

- [x] Documentation (AC: tous)
  - [x] Mettre à jour `docs/guide.md`: section "Créer un nouveau client" + "Modifier un client"
  - [x] Mettre à jour `docs/faq.md`: "Que faire si l'email est déjà utilisé?", "Comment modifier un client?"
  - [x] Mettre à jour `docs/flows.md`: diagrammes flux "Création d'un client" et "Édition d'un client"

## Dev Notes

### Architecture Patterns

**Data Fetching Pattern:**
- **Server Action** pour mutations: `createClient()`, `updateClient()`
- Format de retour obligatoire: `{ data: Client | null, error: ActionError | null }`
- Jamais de `throw` dans les Server Actions, toujours un retour typé

**Form Management:**
- **react-hook-form** avec `zodResolver` pour validation côté client
- **Zod schemas** centralisés dans `@monprojetpro/utils/validation-schemas.ts`
- Validation double couche: client (UX rapide) + serveur (sécurité)

**State Management:**
- **Form state** → react-hook-form (local au composant)
- **Server data** → TanStack Query (cache invalidé après mutations)
- **Dialog open/close** → state local React ou Zustand si réutilisé

**Cache Invalidation:**
```typescript
// Après createClient ou updateClient réussi
queryClient.invalidateQueries({ queryKey: ['clients', operatorId] })
queryClient.invalidateQueries({ queryKey: ['client', clientId] })
```

**Auth & Security:**
- **RLS** : Les policies `clients_insert_operator` et `clients_update_operator` garantissent que seul l'operator propriétaire peut créer/modifier
- **Validation serveur** : Double check de l'unicité email pour éviter race conditions
- **operator_id** : Récupéré du token Supabase auth côté serveur (jamais depuis le client)

### Source Tree Components to Touch

**New Files:**
```
packages/modules/crm/
├── components/
│   ├── client-form.tsx                   # NEW: Formulaire création/édition
│   ├── client-form.test.tsx              # NEW: Tests
│   ├── create-client-dialog.tsx          # NEW: Dialog modal création
│   ├── create-client-dialog.test.tsx     # NEW: Tests
│   ├── edit-client-dialog.tsx            # NEW: Dialog modal édition
├── actions/
│   ├── create-client.ts                  # NEW: Server Action création
│   ├── create-client.test.ts             # NEW: Tests
│   ├── update-client.ts                  # NEW: Server Action édition
│   └── update-client.test.ts             # NEW: Tests
```

**Modified Files:**
```
packages/utils/src/validation-schemas.ts   # ADD: createClientSchema, updateClientSchema
packages/utils/src/index.ts                # ADD: exports createClientSchema, updateClientSchema, clientTypeSchema
packages/modules/crm/types/crm.types.ts    # ADD: CreateClientInput, UpdateClientInput
packages/modules/crm/components/client-list.tsx  # ADD: Bouton "Créer un client" dans header
packages/modules/crm/index.ts             # ADD: exports nouveaux composants, actions, types
packages/modules/crm/package.json         # ADD: @hookform/resolvers dependency
```

**Database Dependencies:**
- Table `clients` (créée en Story 1.2, migration 00001)
- Table `client_configs` (créée en Story 1.2, migration 00002)
- RLS policies: `clients_insert_operator`, `clients_update_operator`

### Testing Standards Summary

**Tests obligatoires:**
1. **Unit tests** (Vitest)
   - `client-form.test.tsx`: Rendu champs, validation, soumission, mode création vs édition
   - `create-client.test.ts`: Validation Zod, unicité email, RLS, format retour
   - `update-client.test.ts`: Update fields, ownership, email uniqueness

2. **Integration tests**
   - Flux complet: remplir formulaire → submit → création DB → invalidation cache → toast
   - Test erreur email dupliqué: message clair affiché

3. **E2E tests** (Playwright)
   - Créer client → redirection fiche → données affichées correctement
   - Modifier client → toast success → données mises à jour

4. **RLS tests** (Supabase)
   - Operator A crée client → operator B ne peut pas le voir
   - Operator A ne peut pas modifier client de operator B

**Coverage target:** >80% sur actions/, components/ formulaire

### Project Structure Notes

**Alignement avec structure unifiée:**
- Actions dans `packages/modules/crm/actions/` avec format `{ data, error }` ✓
- Validation schemas centralisés dans `@monprojetpro/utils/validation-schemas.ts` ✓
- Tests co-localisés: `*.test.ts` à côté des sources ✓
- Composants dans `packages/modules/crm/components/` ✓

**Conventions de nommage respectées:**
- Tables DB: `clients`, `client_configs` (snake_case pluriel) ✓
- Colonnes DB: `operator_id`, `client_id`, `created_at` (snake_case) ✓
- Types TS: `CreateClientInput`, `ClientType` (PascalCase) ✓
- Composants: `ClientForm`, `CreateClientDialog` (PascalCase) ✓
- Fichiers: `client-form.tsx`, `create-client.ts` (kebab-case) ✓
- Actions: `createClient()`, `updateClient()` (camelCase verbe d'action) ✓

**Transformation DB ↔ API:**
- Server Actions reçoivent camelCase depuis client
- Transformation en snake_case pour requêtes Supabase
- Transformation en camelCase pour retour client via typed object mapping

**Pas de conflit détecté.** Structure conforme aux patterns d'implémentation.

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-2-gestion-de-la-relation-client-crm-hub-stories-detaillees.md#Story-2.2]
- [Source: _bmad-output/planning-artifacts/architecture/04-implementation-patterns.md#API-Response-Format]
- [Source: _bmad-output/planning-artifacts/architecture/04-implementation-patterns.md#Error-Handling]
- [Source: _bmad-output/planning-artifacts/prd/functional-requirements-monprojetpro-plateforme.md#FR1-FR2]
- [Source: CLAUDE.md#Data-Fetching-Server-Action-for-mutations]
- [Source: CLAUDE.md#API-Response-Format-always-data-error]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Zod validation: `createClientSchema` aligned with existing `ClientTypeEnum` values ('complet', 'direct-one', 'ponctuel') instead of story values ('complete', 'ponctual')
- Client schema `company` field has `min(1)` validation — createClient action defaults company to client name when not provided
- Form uses `noValidate` to bypass native HTML5 validation and let Zod handle all validation
- Radix Dialog portals don't work well in happy-dom — dialog integration tests kept minimal, form tests cover the logic

### Completion Notes List

- ✅ Task 1: `createClientSchema` + `updateClientSchema` added to `@monprojetpro/utils/validation-schemas.ts` with 17 tests
- ✅ Task 2: `CreateClientInput`, `UpdateClientInput` types added to CRM types (Zod infer)
- ✅ Task 3: `ClientForm` component with react-hook-form + zodResolver, create/edit modes, 11 tests
- ✅ Task 4: `CreateClientDialog` with Radix Dialog, TanStack Query cache invalidation, 2 tests
- ✅ Task 5: `createClient` Server Action — auth check, Zod validation, email uniqueness, DB insert + client_configs, 6 tests
- ✅ Task 6: `updateClient` Server Action — auth check, partial update, email uniqueness (neq), 7 tests
- ✅ Task 7: Integrated `CreateClientDialog` button in `ClientList` header
- ✅ Task 8: `EditClientDialog` component created for Story 2.3 integration
- ✅ Task 9: Error handling — inline validation, server error on email field, toast errors, form state preserved
- ✅ Task 10: Post-creation navigation — router.push, toast, dialog close
- ✅ Task 11: 50 new tests total (all passing), full suite 636 tests GREEN, 0 regressions
- ✅ Task 12: Documentation updated (guide.md, faq.md, flows.md)
- ⏭️ E2E Playwright test deferred (requires Supabase infrastructure)

### File List

**New Files:**
- `packages/modules/crm/components/client-form.tsx`
- `packages/modules/crm/components/client-form.test.tsx`
- `packages/modules/crm/components/create-client-dialog.tsx`
- `packages/modules/crm/components/create-client-dialog.test.tsx`
- `packages/modules/crm/components/edit-client-dialog.tsx`
- `packages/modules/crm/components/edit-client-dialog.test.tsx`
- `packages/modules/crm/actions/create-client.ts`
- `packages/modules/crm/actions/create-client.test.ts`
- `packages/modules/crm/actions/update-client.ts`
- `packages/modules/crm/actions/update-client.test.ts`

**Modified Files:**
- `packages/utils/src/validation-schemas.ts` — Added createClientSchema, updateClientSchema, clientTypeSchema + phone validation
- `packages/utils/src/validation-schemas.test.ts` — Added 17 tests for new schemas
- `packages/utils/src/index.ts` — Added exports for new schemas
- `packages/modules/crm/types/crm.types.ts` — Added CreateClientInput, UpdateClientInput
- `packages/modules/crm/types/crm.types.test.ts` — Added 2 tests for new types
- `packages/modules/crm/components/client-list.tsx` — Added CreateClientDialog button in header
- `packages/modules/crm/components/client-list.test.tsx` — Added mocks for dialog dependencies
- `packages/modules/crm/index.ts` — Added exports for new components, actions, types
- `packages/modules/crm/package.json` — Added @hookform/resolvers dependency (pinned ^3.9.0)
- `packages/modules/crm/docs/guide.md` — Added "Créer un nouveau client" and "Modifier un client" sections
- `packages/modules/crm/docs/faq.md` — Added creation/edition FAQ entries
- `packages/modules/crm/docs/flows.md` — Added creation and edition flow diagrams

## Change Log

- 2026-02-13: Story 2.2 implementation complete — all tasks done, 43 new tests, 629 total GREEN, documentation updated
- 2026-02-13: Code review adversariale — 8 issues fixed (1 CRITICAL, 3 HIGH, 4 MEDIUM), +7 tests, suite 636 GREEN

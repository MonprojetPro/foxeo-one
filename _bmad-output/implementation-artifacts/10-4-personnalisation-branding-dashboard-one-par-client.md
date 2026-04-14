# Story 10.4: Personnalisation branding dashboard One par client

Status: done

## Story

As a **MiKL (opérateur)**,
I want **personnaliser le branding du dashboard One de chaque client (logo, nom affiché, couleurs)**,
so that **chaque client a un espace qui porte visuellement son identité**.

## Acceptance Criteria

**Given** MiKL consulte la fiche d'un client One (FR139)
**When** il accède à la section "Branding"
**Then** il voit un formulaire de personnalisation :
- **Logo** : upload d'image (PNG, SVG, max 2 Mo) avec aperçu
- **Nom affiché** : le nom qui apparaît dans le header du dashboard (défaut : nom de l'entreprise du client)
- **Couleur d'accent** : color picker pour la couleur dominante du dashboard (défaut : couleur One standard `#F7931E`)
- **Aperçu en temps réel** : un mini-preview du dashboard avec les modifications appliquées
- Boutons "Sauvegarder" / "Réinitialiser aux valeurs par défaut"

**Given** MiKL sauvegarde le branding
**When** la Server Action `updateClientBranding(clientId, branding)` s'exécute
**Then** la configuration est stockée dans `client_configs.custom_branding` :
```typescript
type CustomBranding = {
  logoUrl: string | null        // URL dans Supabase Storage
  displayName: string | null    // Nom affiché
  accentColor: string | null    // Couleur hex (#FF5733)
  updatedAt: string
}
```
**And** le logo est uploadé dans Supabase Storage (dossier `/clients/{clientId}/branding/`)
**And** l'effet est immédiat au prochain chargement du dashboard client
**And** un toast confirme "Branding mis à jour pour {client}"

**Given** le client One se connecte avec un branding personnalisé
**When** le dashboard se charge
**Then** :
- Le logo personnalisé remplace le logo MonprojetPro One dans le header et la sidebar
- Le nom affiché remplace "MonprojetPro One" dans le header
- La couleur d'accent est appliquée via des CSS custom properties (override de la variable `--accent`)
- Le reste du design (typographie, layout, structure) reste standard
**And** si aucun branding personnalisé n'est défini, le design One par défaut est utilisé
**And** le branding est chargé via le layout `(dashboard)/layout.tsx` qui résout aussi le `custom_branding`

## Tasks / Subtasks

- [x] Mettre à jour le type `CustomBranding` dans `@monprojetpro/types` (AC: #2)
  - [x] Modifier `packages/types/src/client-config.types.ts`
  - [x] Remplacer le type existant `CustomBranding` par :
    ```typescript
    type CustomBranding = {
      logoUrl: string | null
      displayName: string | null
      accentColor: string | null
      updatedAt: string
    }
    ```
  - [x] S'assurer que `ClientConfig.customBranding?: CustomBranding` est correctement typé

- [x] Créer Server Action `updateClientBranding` (AC: #2)
  - [x] Créer `packages/modules/crm/actions/update-client-branding.ts`
  - [x] Signature: `updateClientBranding(clientId: string, branding: Partial<CustomBranding>): Promise<ActionResponse<CustomBranding>>`
  - [x] Validation Zod : clientId UUID, accentColor regex hex `/#[0-9A-Fa-f]{6}/`, displayName max 50 chars
  - [x] Si logo uploadé : via paramètre séparé `logoFile: File` → upload Supabase Storage dans `/clients/{clientId}/branding/logo.{ext}`
  - [x] Générer URL publique logo via `supabase.storage.from('client-assets').getPublicUrl(path)`
  - [x] UPDATE `client_configs SET custom_branding = $branding WHERE client_id = $clientId`
  - [x] INSERT `activity_logs` : type 'branding_updated', metadata `{ displayName, hasLogo, accentColor }`
  - [x] Format `{ data: CustomBranding, error }` standard

- [x] Créer Server Action upload logo séparé (AC: #2)
  - [x] Créer `packages/modules/crm/actions/upload-client-logo.ts`
  - [x] Signature: `uploadClientLogo(clientId: string, file: FormData): Promise<ActionResponse<{ logoUrl: string }>>`
  - [x] Validation : file type `image/png` | `image/svg+xml`, max 2 Mo
  - [x] Upload dans bucket `client-assets` / path `/clients/{clientId}/branding/logo.{ext}`
  - [x] Si logo existant → `upsert: true` (remplace l'existant)
  - [x] Retourner URL publique

- [x] Créer composant formulaire branding Hub (AC: #1)
  - [x] Créer `packages/modules/crm/components/client-branding-form.tsx`
  - [x] Composant 'use client' avec React Hook Form + Zod
  - [x] Champ upload logo : `<input type="file" accept="image/png,image/svg+xml">` + aperçu `<img>`
  - [x] Champ nom affiché : `<input type="text">` avec placeholder (nom entreprise client)
  - [x] Champ couleur d'accent : `<input type="color">` avec valeur défaut `#F7931E`
  - [x] Mini-preview : un header factice avec le logo + nom + couleur appliqués en temps réel (`style={{ '--preview-accent': accentColor }}`)
  - [x] Bouton "Sauvegarder" → appel `uploadClientLogo` si logo fourni, puis `updateClientBranding`
  - [x] Bouton "Réinitialiser" → reset form + `updateClientBranding({ logoUrl: null, displayName: null, accentColor: null })`

- [x] Intégrer formulaire branding dans la fiche client Hub (AC: #1)
  - [x] Ajouter onglet "Branding" dans la vue détaillée client CRM (composant tabs Story 2.3)
  - [x] Fetcher `client_configs.custom_branding` via Server Component
  - [x] Passer données initiales à `ClientBrandingForm`

- [x] Appliquer branding côté client One dans le layout (AC: #3)
  - [x] Modifier `apps/client/app/(dashboard)/layout.tsx`
  - [x] Après fetch `client_configs`, extraire `custom_branding`
  - [x] Si `custom_branding.accentColor` → injecter CSS variable via `style` prop sur un wrapper `<div style={{ '--accent': accentColor }}>` autour du `DashboardShell`
  - [x] Passer `custom_branding.logoUrl` et `custom_branding.displayName` au `ClientHeader`
  - [x] `ClientHeader` : si `logoUrl` → `<img src={logoUrl}>`, sinon logo MonprojetPro One ; si `displayName` → afficher à la place de "Mon espace"

- [x] Créer bucket Supabase Storage `client-assets` (si inexistant) (AC: #2)
  - [x] Vérifier dans `supabase/config.toml` ou migrations si bucket existe
  - [x] Si inexistant : créer migration `supabase/migrations/00061_create_client_assets_bucket.sql`
  - [x] Bucket public pour logos (URLs publiques sans auth)
  - [x] RLS : upload autorisé uniquement par operator (is_operator())
  - [x] Max file size : 2 Mo

- [x] Créer tests unitaires (TDD)
  - [x] Test `updateClientBranding` : mise à jour branding, validation Zod, activity_log, reset (12 tests)
  - [x] Test `uploadClientLogo` : upload valide, type invalide, taille dépassée (8 tests)
  - [x] Test `client-branding-form.tsx` : rendu initial, preview en temps réel, submit, reset (12 tests)
  - [x] Test layout client : application CSS variable accent, logo personnalisé affiché (8 tests)

## Dev Notes

### Architecture Patterns
- **Pattern Storage Supabase** : upload logo → bucket `client-assets` → URL publique → stocker dans `custom_branding.logoUrl`
- **Pattern CSS variable override** : `style={{ '--accent': accentColor }}` sur un wrapper parent — Tailwind v4 avec OKLCH variables lit automatiquement cette override
- **Pattern branding RSC** : branding chargé côté serveur dans le layout RSC → injecté comme props statiques → pas de TanStack Query (layout ne peut pas être 'use client')
- **Pattern FormData upload** : les Server Actions Next.js acceptent `FormData` pour les fichiers → `formData.get('file') as File`

### Source Tree Components
```
supabase/migrations/
└── 00061_create_client_assets_bucket.sql           # CRÉER (si bucket inexistant)

packages/types/src/
└── client-config.types.ts                          # MODIFIER: CustomBranding type complet

packages/modules/crm/
├── actions/
│   ├── update-client-branding.ts                   # CRÉER: Server Action branding
│   ├── update-client-branding.test.ts             # CRÉER: tests
│   ├── upload-client-logo.ts                       # CRÉER: Server Action upload
│   └── upload-client-logo.test.ts                 # CRÉER: tests
└── components/
    ├── client-branding-form.tsx                    # CRÉER: formulaire branding Hub
    ├── client-branding-form.test.ts               # CRÉER: tests
    └── client-detail-tabs.tsx (ou équivalent)     # MODIFIER: ajouter onglet "Branding"

apps/client/app/(dashboard)/
├── layout.tsx                                      # MODIFIER: appliquer custom_branding
└── logout-button.tsx                               # NON MODIFIÉ
```

### Existing Code Findings
- `CustomBranding` type actuel dans `packages/types/src/client-config.types.ts` :
  ```typescript
  type CustomBranding = {
    logoUrl?: string
    primaryColor?: string
    companyName?: string
  }
  ```
  → À migrer vers `{ logoUrl: null | string; displayName: null | string; accentColor: null | string; updatedAt: string }`
- `client_configs.custom_branding JSONB NOT NULL DEFAULT '{}'` — déjà existant
- `apps/client/app/(dashboard)/layout.tsx` — already fetches `client_configs` (Story 10.1) → réutiliser ce fetch pour le branding
- Supabase Storage : vérifier si bucket `client-assets` existe (probablement pas encore créé — Epic 4 utilisait un bucket `documents`)
- Migration numéro : après `00060` (Story 10.3) → `00061`

### Technical Constraints
- **CSS variable `--accent` en OKLCH** : Tailwind v4 utilise OKLCH (`oklch(...)`) pas hex → si on override `--accent` avec une hex `#F7931E`, le CSS peut ne pas fonctionner. Solution : convertir hex vers OKLCH dans le layout, ou utiliser `--accent-hex` comme variable intermédiaire
- **Upload depuis Server Action** : Next.js App Router supporte `FormData` dans Server Actions — utiliser `<form action={uploadAction}>` avec `<input type="file">` OU appel explicite via `await uploadClientLogo(clientId, formData)`
- **URL publique Storage** : si bucket public → `getPublicUrl()` sans auth ; si privé → `createSignedUrl()` (TTL) — préférer bucket public pour logos (assets statiques non sensibles)
- **Réinitialisation logo** : supprimer le fichier dans Storage via `supabase.storage.from('client-assets').remove([path])` lors du reset
- **Migration CustomBranding** : le type change de `primaryColor`/`companyName` vers `accentColor`/`displayName` → vérifier que aucun code n'utilise les anciens champs

### UI Patterns
- Color picker : `<input type="color">` natif → compatible tous navigateurs modernes
- Preview mini-header : `<div style={{ backgroundColor: accentColor, ... }}>` — pas besoin de CSS classes
- Logo upload aperçu : `URL.createObjectURL(file)` pour preview local avant upload
- Toast pattern : `showSuccess('Branding mis à jour pour {client}')` depuis `@monprojetpro/ui`
- Bouton reset destructive : `<Button variant="outline" onClick={handleReset}>Réinitialiser</Button>`

### Previous Story Learnings
- Supabase Storage : pattern upload `supabase.storage.from(bucket).upload(path, file, { upsert: true })`
- `getPublicUrl()` retourne toujours une URL (même si fichier inexistant) → ne pas utiliser pour vérifier existence
- Activity logs : pattern établi dans toutes les actions mutations — toujours logger
- Pattern Zod regex : `z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Couleur hex invalide').nullable()`
- Tests mock Storage : `vi.mock('@monprojetpro/supabase', ...)` + mock `.storage.from().upload()` et `.getPublicUrl()`

### References
- [Source: _bmad-output/planning-artifacts/epics/epic-10-dashboard-one-modules-commerciaux-stories-detaillees.md#Story 10.4]
- [Source: packages/types/src/client-config.types.ts] — CustomBranding type à migrer
- [Source: supabase/migrations/00003_create_client_configs.sql] — custom_branding JSONB
- [Source: docs/project-context.md#Themes & Palettes] — palette One #F7931E
- [Source: docs/project-context.md#API Response Format] — ActionResponse pattern
- [Source: apps/client/app/(dashboard)/layout.tsx] — layout client à modifier

## Dev Agent Record

### Agent Model Used

claude-opus-4-6

### Debug Log References

### Completion Notes List

- CustomBranding type migré: `logoUrl?/primaryColor?/companyName?` → `logoUrl|null / displayName|null / accentColor|null / updatedAt`
- Ancien code `core-dashboard` mis à jour pour utiliser `displayName` au lieu de `companyName`
- Server Action `updateClientBranding` : validation Zod, merge partiel (préserve champs non modifiés), activity log
- Server Action `uploadClientLogo` : validation type (PNG/SVG) + taille (2 Mo), upload Supabase Storage avec upsert
- Formulaire branding Hub : upload logo avec aperçu local (`URL.createObjectURL`), color picker natif, mini-preview temps réel, boutons save/reset
- Onglet "Branding" ajouté dans `client-detail-with-support.tsx` via pattern `extraTabs`
- Layout client One : fetch `custom_branding` dans le select join, CSS variable `--accent` sur wrapper, logo+displayName dans header et sidebar
- Migration `00061` : bucket `client-assets` public + RLS operator-only pour upload/update/delete
- 64 tests passing (12 updateClientBranding + 8 uploadClientLogo + 12 branding form + 12 layout + 6 getClientConfig + 14 coreDashboard)
- CR fixes: memory leak URL.createObjectURL revoke, ClientBrandingTab error handling, hex validation client-side, redundant setSaving removed, getClientBranding tests added
- Post-CR: 70 tests passing (+5 getClientBranding + 1 hex validation)

### File List

- `packages/types/src/client-config.types.ts` — MODIFIED: CustomBranding type migré
- `packages/modules/crm/actions/update-client-branding.ts` — CREATED
- `packages/modules/crm/actions/update-client-branding.test.ts` — CREATED
- `packages/modules/crm/actions/upload-client-logo.ts` — CREATED
- `packages/modules/crm/actions/upload-client-logo.test.ts` — CREATED
- `packages/modules/crm/actions/get-client-branding.ts` — CREATED
- `packages/modules/crm/components/client-branding-form.tsx` — CREATED
- `packages/modules/crm/components/client-branding-form.test.ts` — CREATED
- `packages/modules/crm/components/client-branding-tab.tsx` — CREATED
- `packages/modules/crm/index.ts` — MODIFIED: exports ajoutés
- `apps/hub/app/(dashboard)/modules/crm/clients/[clientId]/client-detail-with-support.tsx` — MODIFIED: onglet Branding
- `apps/client/app/(dashboard)/layout.tsx` — MODIFIED: branding CSS + header
- `apps/client/app/(dashboard)/layout.test.ts` — CREATED
- `supabase/migrations/00061_create_client_assets_bucket.sql` — CREATED
- `packages/modules/core-dashboard/components/core-dashboard.tsx` — MODIFIED: companyName → displayName
- `packages/modules/core-dashboard/components/core-dashboard.test.ts` — MODIFIED: companyName → displayName
- `packages/modules/core-dashboard/actions/get-client-config.test.ts` — MODIFIED: companyName → displayName
- `packages/modules/crm/actions/get-client-branding.test.ts` — CREATED (CR fix)

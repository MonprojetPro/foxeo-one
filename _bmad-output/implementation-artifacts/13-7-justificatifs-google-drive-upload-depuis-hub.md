# Story 13.3: Justificatifs Google Drive — upload depuis le Hub

Status: done

## Story

As a **MiKL (opérateur)**,
I want **uploader mes justificatifs de paiement directement depuis le Hub vers mon Google Drive Workspace**,
so that **Pennylane les lit automatiquement depuis Drive et je n'ai plus à le faire manuellement hors de la plateforme**.

## Acceptance Criteria

**Given** MiKL accède à l'onglet "Comptabilité" → section "Justificatifs"
**When** Google Drive n'est pas encore configuré
**Then** il voit un bandeau "Connecter Google Drive" avec bouton "Configurer" → lance le flow OAuth Google

**Given** MiKL complète le flow OAuth Google Drive
**When** l'autorisation est accordée (scope `drive.file`)
**Then** :
- Token stocké de façon sécurisée dans `system_config` (clé `google_drive_access_token`, `google_drive_refresh_token`, `google_drive_folder_id`)
- Champ de saisie pour l'ID du dossier Drive cible (ou URL du dossier) pré-rempli si déjà connu
- Statut "Google Drive connecté ✓" affiché

**Given** Google Drive est configuré
**When** MiKL glisse-dépose ou sélectionne un fichier (PDF, JPG, PNG — max 10 Mo)
**Then** :
1. Server Action `uploadJustificatif(file, fileName)` → `POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`
2. Fichier déposé dans le dossier Drive configuré
3. Toast "Justificatif envoyé à Google Drive ✓"
4. Entrée dans la liste des uploads récents : nom fichier, date, statut "Envoyé"

**Given** une erreur survient pendant l'upload (réseau, token expiré)
**When** le token est expiré
**Then** : Server Action renouvelle automatiquement via `refresh_token` avant de réessayer (1 tentative)

**Given** MiKL consulte la section "Justificatifs"
**When** des uploads ont déjà été faits
**Then** il voit la liste des 20 derniers uploads (table `justificatif_uploads`) : nom, date, taille, statut (Envoyé / Erreur)

## Tasks / Subtasks

- [x] Créer la migration `00091_create_justificatif_uploads.sql`
  - [x] Table `justificatif_uploads` : `id UUID PK`, `uploaded_by UUID FK`, `file_name TEXT`, `file_size INTEGER`, `mime_type TEXT`, `drive_file_id TEXT`, `status TEXT CHECK ('sent','error')`, `error_message TEXT`, `created_at`, `updated_at`
  - [x] RLS : SELECT/INSERT/DELETE uniquement `is_operator()`
  - [x] Index sur `created_at DESC`
  - [x] Trigger `trg_justificatif_uploads_updated_at`

- [x] Créer la Server Action `uploadJustificatif`
  - [x] `packages/modules/facturation/actions/upload-justificatif.ts`
  - [x] Auth check : `is_operator()` + `uploaded_by` audit trail
  - [x] Validation : type fichier (PDF/JPG/PNG), taille max 10 Mo
  - [x] Sanitisation noms de fichiers (leçon DL-002)
  - [x] Lire `google_drive_access_token` et `google_drive_folder_id` depuis `system_config`
  - [x] `POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart` avec `Authorization: Bearer {token}`
  - [x] Si 401 → refresh token → réessayer
  - [x] Insert dans `justificatif_uploads` (statut 'sent' ou 'error')
  - [x] Retourner `{ data, error }` pattern standard

- [x] Créer la Server Action `configureGoogleDrive` + `updateGoogleDriveFolderId` + `getGoogleDriveStatus`
  - [x] `packages/modules/facturation/actions/configure-google-drive.ts`
  - [x] Upsert atomique (batch) dans `system_config`
  - [x] Auth check : `is_operator()`
  - [x] `getGoogleDriveStatus` : ne retourne JAMAIS les tokens côté client (seulement isConfigured + folderId)

- [x] Créer le composant section Justificatifs Hub
  - [x] `packages/modules/facturation/components/justificatifs-section.tsx`
  - [x] Onglet "Justificatifs" dans le billing-dashboard existant
  - [x] Zone drag & drop + bouton "Sélectionner un fichier"
  - [x] Validation client-side (type + taille) avant envoi serveur
  - [x] Indicateur de progression (upload en cours)
  - [x] Liste uploads récents depuis `justificatif_uploads`

- [x] Créer le composant configuration Drive
  - [x] `packages/modules/facturation/components/google-drive-config.tsx`
  - [x] Bandeau "Connecter" si non configuré / "Connecté ✓" si configuré
  - [x] Champ ID dossier Drive (configurable)
  - [x] Mode édition : update folder ID seul (sans re-saisir tokens)
  - [x] Mode reconfiguration : re-saisie complète des tokens

- [x] Créer les tests (28 tests)
  - [x] Test `upload-justificatif.ts` : auth, validation type/taille, appel Drive API, refresh token, insert DB payload, sanitization (9 tests)
  - [x] Test `configure-google-drive.ts` : auth, validation, batch upsert, status sans tokens, folder update (10 tests)
  - [x] Test `google-drive-config.tsx` : états connecté/non-connecté, pas de tokens affichés (4 tests)
  - [x] Test `justificatifs-section.tsx` : rendu état vide, liste uploads, formats (5 tests)

## Dev Notes

### Architecture Patterns

- **Google Drive API** : appel REST direct depuis Server Action — pas de SDK Node.js Google tiers pour minimiser les dépendances
- **Token storage** : `system_config` table (déjà existante depuis Story 12.1) — clés `google_drive_*`. Ne jamais exposer les tokens côté client
- **OAuth flow** : simplifié — MiKL obtient ses tokens depuis la Google Cloud Console (compte Workspace) et les colle dans la config. Pas de flow OAuth redirect complexe pour l'instant (1 seul utilisateur opérateur)
- **Scope Drive** : `https://www.googleapis.com/auth/drive.file` (accès uniquement aux fichiers créés par l'app, pas à tout le Drive)
- **multipart upload** : pour fichiers < 5 Mo. Pour fichiers > 5 Mo : resumable upload (`uploadType=resumable`)

### Google Drive API — Upload multipart

```typescript
// Exemple Server Action
const metadata = { name: fileName, parents: [folderId] }
const form = new FormData()
form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
form.append('file', fileBlob)

const res = await fetch(
  'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
  {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  }
)
```

### Refresh Token Flow

```typescript
// Si 401, appeler :
const res = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  body: new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  }),
})
const { access_token } = await res.json()
// Upsert nouveau access_token dans system_config
```

### Variables d'environnement requises

Ajouter dans `.env.example` :
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### Source Tree

```
supabase/migrations/
└── 00069_create_justificatif_uploads.sql   # CRÉER

packages/modules/facturation/
├── actions/
│   ├── upload-justificatif.ts              # CRÉER
│   ├── upload-justificatif.test.ts         # CRÉER
│   ├── configure-google-drive.ts           # CRÉER
│   └── configure-google-drive.test.ts      # CRÉER
└── components/
    ├── justificatifs-section.tsx            # CRÉER
    ├── justificatifs-section.test.tsx       # CRÉER
    ├── google-drive-config.tsx              # CRÉER
    └── google-drive-config.test.tsx         # CRÉER

apps/hub/app/(dashboard)/modules/facturation/
└── page.tsx                                 # MODIFIER: ajouter JustificatifsSection

.env.example                                 # MODIFIER: ajouter GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
```

### Existing Code Findings

- `system_config` table : créée Story 12.1, RLS `is_operator()` pour write, public pour read — pattern upsert établi
- Pattern Server Action `{ data, error }` : voir `packages/modules/facturation/actions/create-credit-note.ts`
- `assertOperator()` : disponible dans `assert-operator.ts` partagé (module facturation)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Completion Notes List

- Migration 00091 avec `uploaded_by UUID FK` (audit trail) + DELETE policy pour nettoyage erreurs
- Tokens Google jamais exposés côté client — `getGoogleDriveStatus()` retourne seulement `isConfigured` + `folderId`
- Upsert atomique (batch) pour éviter état incohérent en cas d'erreur partielle
- Validation client-side (type MIME + taille) en plus de la validation serveur
- Sanitisation noms de fichiers appliquée (leçon DL-002)
- Refresh token auto sur 401 avec retry unique
- 28 tests couvrant auth, validation, payload DB, sanitisation, sécurité tokens

### File List

- `supabase/migrations/00091_create_justificatif_uploads.sql` — CRÉÉ
- `packages/modules/facturation/actions/upload-justificatif.ts` — CRÉÉ
- `packages/modules/facturation/actions/upload-justificatif.test.ts` — CRÉÉ
- `packages/modules/facturation/actions/configure-google-drive.ts` — CRÉÉ
- `packages/modules/facturation/actions/configure-google-drive.test.ts` — CRÉÉ
- `packages/modules/facturation/components/justificatifs-section.tsx` — CRÉÉ
- `packages/modules/facturation/components/justificatifs-section.test.tsx` — CRÉÉ
- `packages/modules/facturation/components/google-drive-config.tsx` — CRÉÉ
- `packages/modules/facturation/components/google-drive-config.test.tsx` — CRÉÉ
- `packages/modules/facturation/components/billing-dashboard.tsx` — MODIFIÉ (ajout onglet Justificatifs)
- `.env.example` — MODIFIÉ (ajout GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)

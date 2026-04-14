# Story 13.3: Justificatifs Google Drive — upload depuis le Hub

Status: ready-for-dev

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

- [ ] Créer la migration `00069_create_justificatif_uploads.sql`
  - [ ] Table `justificatif_uploads` : `id UUID PK`, `file_name TEXT`, `file_size INTEGER`, `drive_file_id TEXT`, `status TEXT CHECK ('sent','error')`, `error_message TEXT`, `created_at TIMESTAMPTZ DEFAULT now()`
  - [ ] RLS : SELECT/INSERT uniquement `is_operator()`
  - [ ] Index sur `created_at DESC`

- [ ] Créer la Server Action `uploadJustificatif`
  - [ ] `packages/modules/facturation/actions/upload-justificatif.ts`
  - [ ] Auth check : `is_operator()`
  - [ ] Validation : type fichier (PDF/JPG/PNG), taille max 10 Mo
  - [ ] Lire `google_drive_access_token` et `google_drive_folder_id` depuis `system_config`
  - [ ] `POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart` avec `Authorization: Bearer {token}`
  - [ ] Si 401 → refresh token → réessayer
  - [ ] Insert dans `justificatif_uploads` (statut 'sent' ou 'error')
  - [ ] Retourner `{ data, error }` pattern standard

- [ ] Créer la Server Action `configureGoogleDrive`
  - [ ] `packages/modules/facturation/actions/configure-google-drive.ts`
  - [ ] Upsert dans `system_config` : `google_drive_access_token`, `google_drive_refresh_token`, `google_drive_folder_id`
  - [ ] Auth check : `is_operator()`

- [ ] Créer le composant section Justificatifs Hub
  - [ ] `packages/modules/facturation/components/justificatifs-section.tsx`
  - [ ] Sous-section dans la page Hub Comptabilité existante
  - [ ] Zone drag & drop + bouton "Sélectionner un fichier" (`<input type="file">`)
  - [ ] Indicateur de progression (upload en cours)
  - [ ] Liste uploads récents depuis `justificatif_uploads`

- [ ] Créer le composant configuration Drive
  - [ ] `packages/modules/facturation/components/google-drive-config.tsx`
  - [ ] Bandeau "Connecter" si non configuré / "Connecté ✓" si configuré
  - [ ] Champ ID dossier Drive (configurable)
  - [ ] Note UI : "Pennylane lira automatiquement les fichiers dans ce dossier"

- [ ] Créer les tests
  - [ ] Test `upload-justificatif.ts` : auth, validation type/taille, appel Drive API, refresh token, insert DB (8 tests)
  - [ ] Test `justificatifs-section.tsx` : rendu état vide, liste uploads, bouton (5 tests)

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

_à remplir_

### Completion Notes List

_à remplir_

### File List

_à remplir_

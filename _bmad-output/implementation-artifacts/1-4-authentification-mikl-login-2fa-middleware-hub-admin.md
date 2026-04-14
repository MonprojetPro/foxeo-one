# Story 1.4: Authentification MiKL (login + 2FA, middleware hub admin)

Status: done

## Story

As **MiKL (operateur)**,
I want **me connecter avec email + mot de passe + 2FA et avoir un acces protege au Hub**,
So that **mon acces administrateur est hautement securise**.

## Acceptance Criteria

1. **AC1: Login email + mot de passe**
   - **Given** MiKL avec un compte operateur
   - **When** il accede a hub.monprojet-pro.com/login et saisit email + mot de passe valides
   - **Then** il est redirige vers l'ecran de saisie du code 2FA (TOTP)

2. **AC2: Verification 2FA TOTP**
   - **Given** MiKL sur l'ecran 2FA
   - **When** il saisit le code TOTP correct (6 chiffres)
   - **Then** il est redirige vers le dashboard Hub `/(dashboard)/`
   - **And** la session est creee avec le flag admin verifie

3. **AC3: Echec 2FA**
   - **Given** MiKL sur l'ecran 2FA
   - **When** il saisit un code TOTP incorrect
   - **Then** un message d'erreur explicite s'affiche
   - **And** le compteur d'echecs s'incremente

4. **AC4: Middleware Hub — protection admin + 2FA**
   - **Given** un utilisateur non authentifie ou sans role admin
   - **When** il tente d'acceder a une route hub.monprojet-pro.com/(dashboard)/*
   - **Then** le middleware hub/ verifie admin + 2FA
   - **And** il est redirige vers /login

5. **AC5: Setup initial 2FA**
   - **Given** MiKL sur la page de premiere configuration 2FA
   - **When** il scanne le QR code et valide avec un code TOTP
   - **Then** le 2FA est active sur son compte
   - **And** des codes de recuperation sont generes et affiches une seule fois

6. **AC6: UI login Hub — palette Hub sur fond dark**
   - **Given** la page login Hub
   - **When** elle est affichee
   - **Then** elle utilise la palette Hub sur fond #020402
   - **And** elle est responsive (mobile >=320px)
   - **And** skeleton loaders pour les etats de chargement

## Tasks / Subtasks

- [x] Task 1 — Migration: ajouter `auth_user_id` a la table operators (AC: #1)
  - [x] 1.1 Creer `supabase/migrations/00010_operators_auth_user_id.sql`
  - [x] 1.2 Ajouter colonne `auth_user_id UUID REFERENCES auth.users(id) UNIQUE`
  - [x] 1.3 Mettre a jour `packages/types/src/database.types.ts` avec le nouveau champ

- [x] Task 2 — Activer MFA TOTP dans Supabase (AC: #2, #5)
  - [x] 2.1 Modifier `supabase/config.toml` : `[auth.mfa.totp]` → `enroll_enabled = true`, `verify_enabled = true`
  - [x] 2.2 Verifier que `max_enrolled_factors = 10` est suffisant

- [x] Task 3 — Server Actions auth Hub (AC: #1, #2, #3)
  - [x] 3.1 Creer `apps/hub/app/(auth)/actions/auth.ts` avec `'use server'`
  - [x] 3.2 Implementer `hubLoginAction(formData)` → retourne `ActionResponse<HubLoginResult>`
  - [x] 3.3 Implementer `hubVerifyMfaAction(formData)` → verifie le code TOTP via `supabase.auth.mfa.verify()` → retourne `ActionResponse<UserSession>`
  - [x] 3.4 Implementer `hubLogoutAction()` → retourne `ActionResponse<null>`
  - [x] 3.5 Implementer `hubSetupMfaAction()` → `supabase.auth.mfa.enroll({ factorType: 'totp' })` → retourne `ActionResponse<MfaSetupResult>`
  - [x] 3.6 Implementer `hubVerifyMfaSetupAction(formData)` → verifie code initial + active le facteur → retourne `ActionResponse<MfaSetupVerifyResult>`
  - [x] 3.7 Validation Zod des inputs (hubLoginSchema, mfaCodeSchema)
  - [x] 3.8 Brute force protection via `fn_check_login_attempts` / `fn_record_login_attempt` (reutilise Story 1.3)
  - [x] 3.9 Tests unitaires (schemas — 13 tests dans auth.test.ts)

- [x] Task 4 — Middleware auth Hub (AC: #4)
  - [x] 4.1 Remplacer le placeholder `apps/hub/middleware.ts` par la logique auth complete
  - [x] 4.2 Verifier : session active + role admin/operator dans la table `operators`
  - [x] 4.3 Verifier : `two_factor_enabled = true` ET `aal2` (Assurance Level 2) dans la session
  - [x] 4.4 Si pas authentifie → redirect `/login`
  - [x] 4.5 Si authentifie mais pas admin → redirect `/login?error=unauthorized`
  - [x] 4.6 Si admin mais 2FA non verifie (aal1 seulement) → redirect `/login/verify-mfa`
  - [x] 4.7 Routes publiques : `/login`, `/setup-mfa`, `/auth/callback`
  - [x] 4.8 Exporter helpers `isPublicPath`, `isStaticOrApi`, `PUBLIC_PATHS` (meme pattern que client)
  - [x] 4.9 Tests unitaires du middleware (18 tests dans middleware.test.ts)

- [x] Task 5 — Page Login Hub UI (AC: #1, #6)
  - [x] 5.1 Remplacer `apps/hub/app/(auth)/login/page.tsx` (Server Component avec Card + Suspense)
  - [x] 5.2 Creer `apps/hub/app/(auth)/login/login-form.tsx` (Client Component — RHF + Zod)
  - [x] 5.3 Design dark mode palette Hub, fond bg-background
  - [x] 5.4 Responsive mobile >=320px (max-w-md, p-4)
  - [x] 5.5 Creer `apps/hub/app/(auth)/login/loading.tsx` (skeleton)

- [x] Task 6 — Page Verification 2FA UI (AC: #2, #3)
  - [x] 6.1 Creer `apps/hub/app/(auth)/login/verify-mfa/page.tsx`
  - [x] 6.2 Creer `apps/hub/app/(auth)/login/verify-mfa/mfa-form.tsx` (Client Component)
  - [x] 6.3 Input 6 chiffres, autosubmit quand complet
  - [x] 6.4 Affichage erreur si code invalide
  - [x] 6.5 Creer `apps/hub/app/(auth)/login/verify-mfa/loading.tsx` (skeleton)

- [x] Task 7 — Page Setup 2FA initial (AC: #5)
  - [x] 7.1 Creer `apps/hub/app/(auth)/setup-mfa/page.tsx`
  - [x] 7.2 Creer `apps/hub/app/(auth)/setup-mfa/setup-mfa-form.tsx` (Client Component — 3 etapes)
  - [x] 7.3 Afficher QR code (via `enroll.totp.qr_code`) + secret pour saisie manuelle
  - [x] 7.4 Champ de verification du code TOTP pour activer le facteur
  - [x] 7.5 Afficher les 10 codes de recuperation une seule fois apres activation
  - [x] 7.6 Bouton "J'ai note mes codes" pour confirmer et rediriger vers dashboard
  - [x] 7.7 Creer `apps/hub/app/(auth)/setup-mfa/loading.tsx` (skeleton)

- [x] Task 8 — Bouton deconnexion Hub (AC: #1)
  - [x] 8.1 Creer `apps/hub/app/(dashboard)/logout-button.tsx` (meme pattern que client)
  - [x] 8.2 Integrer dans `apps/hub/app/(dashboard)/layout.tsx` → HubHeader

- [x] Task 9 — Dependencies Hub (AC: toutes)
  - [x] 9.1 Ajouter a `apps/hub/package.json` : `react-hook-form@^7.71.0`, `@hookform/resolvers@^3.9.0`, `zod@^3.24.0`

- [x] Task 10 — Tests (AC: toutes)
  - [x] 10.1 Tests schemas Zod : 6 hubLoginSchema + 7 mfaCodeSchema = 13 tests
  - [x] 10.2 Tests middleware Hub : 18 tests (PUBLIC_PATHS, isPublicPath 8 cas, isStaticOrApi 7 cas)
  - [x] 10.3 Tests co-localises a cote des fichiers source

## Dev Notes

### Architecture Patterns — OBLIGATOIRES

**Data Fetching — 3 patterns seulement :**

| Pattern | Usage dans cette story |
|---------|----------------------|
| Server Component | Pages login, verify-mfa, setup-mfa (lecture config) |
| Server Action | `hubLoginAction`, `hubVerifyMfaAction`, `hubLogoutAction`, `hubSetupMfaAction`, `hubVerifyMfaSetupAction` |
| API Route | INTERDIT pour cette story (pas de webhook) |

**Reponse Server Action — TOUJOURS `{ data, error }` :**
```typescript
// apps/hub/app/(auth)/actions/auth.ts
'use server'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { createServerSupabaseClient } from '@monprojetpro/supabase'

// JAMAIS throw dans les Server Actions
```

### Supabase MFA API — Pattern a suivre

**Supabase MFA utilise un flow en 2 etapes :**

```typescript
// 1. Login email+password → retourne session avec aal1 (pas encore 2FA)
const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password })
// authData.session existe mais avec AAL1 seulement

// 2. Lister les facteurs MFA de l'utilisateur
const { data: factors } = await supabase.auth.mfa.listFactors()
// factors.totp → tableau de facteurs TOTP

// 3. Creer un challenge pour le facteur
const { data: challenge } = await supabase.auth.mfa.challenge({ factorId: factors.totp[0].id })

// 4. Verifier le code TOTP
const { data: verify } = await supabase.auth.mfa.verify({
  factorId: factors.totp[0].id,
  challengeId: challenge.id,
  code: totpCode
})
// verify eleve la session a AAL2

// ENROLLMENT (setup initial) :
const { data: enroll } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
// enroll.totp.qr_code → data URL du QR code
// enroll.totp.secret → cle secrete pour saisie manuelle
// enroll.totp.uri → URI otpauth://

// Verification de l'enrollment :
const { data: challengeSetup } = await supabase.auth.mfa.challenge({ factorId: enroll.id })
const { data: verifySetup } = await supabase.auth.mfa.verify({
  factorId: enroll.id,
  challengeId: challengeSetup.id,
  code: firstCode
})
```

### Middleware Hub — Verification AAL2

**Le middleware Hub DOIT verifier le AAL (Authentication Assurance Level) :**

```typescript
// apps/hub/middleware.ts — PATTERN
import { createMiddlewareSupabaseClient } from '@monprojetpro/supabase'

export async function middleware(request: NextRequest) {
  if (isStaticOrApi(request.nextUrl.pathname)) return NextResponse.next()

  const { supabase, user, response } = await createMiddlewareSupabaseClient(request)
  const isPublic = isPublicPath(request.nextUrl.pathname)

  // 1. Pas authentifie → login
  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 2. Authentifie sur route publique → dashboard
  if (user && isPublic) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // 3. Authentifie sur route protegee → verifier admin + AAL2
  if (user && !isPublic) {
    // Verifier role operateur via table operators
    const { data: operator } = await supabase
      .from('operators')
      .select('id, role, two_factor_enabled')
      .eq('email', user.email)
      .single()

    if (!operator) {
      return NextResponse.redirect(new URL('/login?error=unauthorized', request.url))
    }

    // Verifier AAL2 (2FA verifie dans la session courante)
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aal?.currentLevel !== 'aal2') {
      // 2FA pas encore setup → page setup
      if (!operator.two_factor_enabled) {
        return NextResponse.redirect(new URL('/setup-mfa', request.url))
      }
      // 2FA setup mais pas verifie cette session → page verify
      return NextResponse.redirect(new URL('/login/verify-mfa', request.url))
    }
  }

  return response
}
```

### Ce qui existe DEJA — NE PAS recreer

**packages/supabase/** :
- `createMiddlewareSupabaseClient(request)` → `{ supabase, user, response }`
- `createServerSupabaseClient()` → pour Server Actions
- `createClient()` → pour Client Components (browser)

**packages/types/** :
- `ActionResponse<T>`, `successResponse()`, `errorResponse()`
- `UserSession` (avec `operatorId?: string`)
- `UserRole = 'operator' | 'client' | 'admin'`
- `DashboardType = 'hub' | 'lab' | 'one'`

**packages/utils/** :
- `emailSchema` (Zod), `passwordSchema` (Zod)

**Composants @monprojetpro/ui** :
- `Button`, `Input`, `Alert`, `AlertDescription`, `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`, `Skeleton`, `DashboardShell`

**Fonctions SQL existantes** (Story 1.3) :
- `fn_check_login_attempts(p_email, p_window_minutes?, p_max_attempts?)` → brute force check
- `fn_record_login_attempt(p_email, p_ip_address?, p_success?)` → record attempt
- Reutiliser exactement pour le Hub login (meme table `login_attempts`, meme logique)

### Schema operators existant

```sql
-- Migration 00001 — Table operators actuelle
CREATE TABLE operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('operator', 'admin')),
  two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**MANQUE :** Colonne `auth_user_id` pour lier `operators` a `auth.users`. Migration 00010 doit l'ajouter :

```sql
-- 00010_operators_auth_user_id.sql
ALTER TABLE operators ADD COLUMN auth_user_id UUID UNIQUE REFERENCES auth.users(id);
CREATE INDEX idx_operators_auth_user_id ON operators(auth_user_id);
```

Puis mettre a jour le seed.sql pour lier l'operateur MiKL a un user auth (ou le faire manuellement au premier login).

### config.toml — Modifications requises

```toml
# Section a modifier dans supabase/config.toml :

[auth.mfa.totp]
enroll_enabled = true    # Etait false
verify_enabled = true    # Etait false

# Ajouter Hub URL aux redirections autorisees :
# additional_redirect_urls → ajouter "http://127.0.0.1:3000" (Hub port)
```

Le Hub tourne sur **port 3000** (`apps/hub/package.json` → `next dev --port 3000`).
Le Client tourne sur **port 3001**.

### Hub package.json — Dependencies manquantes

Ajouter a `apps/hub/package.json` :
```json
{
  "dependencies": {
    "react-hook-form": "^7.71.0",
    "@hookform/resolvers": "latest",
    "zod": "^3.24.0"
  }
}
```

**Note :** Utiliser zod v3 (comme le client, Story 1.3 debug log — mismatch zod v3/v4 corrige).

### Flow complet login MiKL

```
1. MiKL → hub.monprojet-pro.com/login
2. Saisit email + mot de passe
3. hubLoginAction() :
   a. Validation Zod
   b. Brute force check (fn_check_login_attempts)
   c. supabase.auth.signInWithPassword()
   d. Record attempt (fn_record_login_attempt)
   e. Si success → verifier si operateur existe dans table operators
   f. Si pas operateur → errorResponse('Acces non autorise')
   g. Verifier two_factor_enabled
   h. Si 2FA pas setup → return { requiresMfa: false, needsSetup: true }
   i. Si 2FA setup → return { requiresMfa: true }
4. Client redirige vers /login/verify-mfa (ou /setup-mfa si premiere fois)
5. MiKL saisit code TOTP (6 chiffres)
6. hubVerifyMfaAction() :
   a. supabase.auth.mfa.challenge()
   b. supabase.auth.mfa.verify() → eleve session a AAL2
   c. Build UserSession avec role='operator', dashboardType='hub', operatorId
   d. return successResponse(session)
7. Client redirige vers /(dashboard)/
```

### Codes de recuperation (10 codes)

Supabase MFA ne genere PAS nativement des recovery codes. Options :
1. **Approche recommandee** : Generer 10 codes aleatoires cote serveur, les hasher (bcrypt/SHA-256), les stocker dans une table `mfa_recovery_codes` ou dans `operators.metadata` (JSONB). Afficher les codes en clair une seule fois.
2. **Migration alternative** : Ajouter colonne `mfa_recovery_codes_hash TEXT[]` a la table `operators`.

Pour le MVP, stocker les hash dans un champ JSONB sur `operators` :

```sql
-- Ajouter dans la migration 00010
ALTER TABLE operators ADD COLUMN mfa_metadata JSONB DEFAULT '{}';
```

### Naming Conventions — RESPECTER

| Element | Convention | Exemple |
|---------|-----------|---------|
| Fichiers composants | kebab-case.tsx | `login-form.tsx`, `mfa-form.tsx` |
| Fichiers actions | kebab-case.ts | `auth.ts` |
| Composants | PascalCase | `LoginForm`, `MfaForm`, `SetupMfaForm` |
| Server Actions | camelCase | `hubLoginAction`, `hubVerifyMfaAction` |
| Types | PascalCase | `HubLoginResult`, `MfaSetupResult` |
| DB tables | snake_case plural | `operators` (existant) |
| DB columns | snake_case | `auth_user_id`, `two_factor_enabled`, `mfa_metadata` |

### Project Structure Notes

```
apps/hub/
├── middleware.ts                                    # ← REMPLACER (placeholder → auth admin+2FA)
├── package.json                                     # ← MODIFIER (ajouter RHF, zod)
├── app/
│   ├── layout.tsx                                   # ← NE PAS MODIFIER (providers OK)
│   ├── (auth)/
│   │   ├── layout.tsx                               # ← MODIFIER (ajouter branding Hub)
│   │   ├── login/
│   │   │   ├── page.tsx                             # ← REMPLACER (Server Component)
│   │   │   ├── login-form.tsx                       # ← CREER (Client Component)
│   │   │   ├── loading.tsx                          # ← CREER (skeleton)
│   │   │   └── verify-mfa/
│   │   │       ├── page.tsx                         # ← CREER
│   │   │       ├── mfa-form.tsx                     # ← CREER (Client Component)
│   │   │       └── loading.tsx                      # ← CREER (skeleton)
│   │   ├── setup-mfa/
│   │   │   ├── page.tsx                             # ← CREER
│   │   │   ├── setup-mfa-form.tsx                   # ← CREER (Client Component)
│   │   │   └── loading.tsx                          # ← CREER (skeleton)
│   │   └── actions/
│   │       └── auth.ts                              # ← CREER (Server Actions)
│   └── (dashboard)/
│       ├── layout.tsx                               # ← MODIFIER (ajouter LogoutButton)
│       └── logout-button.tsx                        # ← CREER (meme pattern client)
```

**Tests co-localises :**
```
apps/hub/app/(auth)/actions/auth.test.ts             # Tests Server Actions schemas
apps/hub/middleware.test.ts                            # Tests middleware Hub
```

**Migrations :**
```
supabase/migrations/00010_operators_auth_user_id.sql  # auth_user_id + mfa_metadata
```

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-1-fondation-plateforme-authentification-stories-detaillees.md — Story 1.4]
- [Source: _bmad-output/planning-artifacts/architecture/03-core-decisions.md — Authentication & Security, Middleware auth]
- [Source: _bmad-output/planning-artifacts/architecture/04-implementation-patterns.md — Naming + Structure Patterns]
- [Source: _bmad-output/planning-artifacts/prd/non-functional-requirements.md — NFR-S4 (8h inactivite), NFR-S5 (5 echecs)]
- [Source: _bmad-output/planning-artifacts/prd/domain-specific-requirements.md — 2FA TOTP obligatoire MiKL, 10 recovery codes]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Dark Mode, Palette Hub]
- [Source: docs/project-context.md — Anti-patterns, Data Fetching Rules, State Management]

### Previous Story Intelligence (Story 1.3)

**Learnings from Story 1.3 (client auth) :**
- Server Actions avec `{data, error}` pattern fonctionne bien
- Brute force via SECURITY DEFINER functions (`fn_check_login_attempts`, `fn_record_login_attempt`) — reutiliser tel quel
- React Hook Form + Zod + shadcn/ui — meme stack pour le Hub
- `LogoutButton` pattern : appel `logoutAction()` puis `router.push('/login')` + `router.refresh()` cote client
- **zod v3** (pas v4) — le client a eu un mismatch, resolu en downgrade vers zod@^3.24.0
- Middleware exporte `isPublicPath`, `isStaticOrApi` pour faciliter les tests
- `useSearchParams()` dans les forms necessite `<Suspense>` boundary
- Skeleton loaders obligatoires pour chaque route auth (`loading.tsx`)
- 22 tests ajoutes (10 schemas + 12 middleware) — viser au moins 15 pour cette story

**Code review fixes de Story 1.3 a anticiper :**
- H1: logoutAction retourne `successResponse(null)`, le client gere la redirection (pas `redirect()`)
- M2: SECURITY DEFINER pour les operations sensibles sur tables sans acces RLS direct
- L1: Wrapping `<Suspense>` autour des composants utilisant `useSearchParams()`

### Git Intelligence

**Derniers commits :**
- `0f2d846` feat: Story 1.3 — Authentification client (login, signup, sessions)
- `7a4dfca` feat: Story 1.2 — Migrations Supabase fondation
- `d165ddf` feat: Story 1.1 — Setup monorepo, shared packages & dashboard shell

**Patterns etablis :**
- Commit message : `feat: Story X.Y — Description`
- Tests Vitest co-localises `*.test.ts`
- TypeScript strict, pas de `any`
- 114 tests existants — zero regressions attendues

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- Build error: Supabase typed client resolves RPC functions to `never` → fixed with `as never` casts on function name and args
- Build error: `.update()` parameter typed as `never` for operators table → fixed with `as never` cast on update payload
- Build error: `user.email` is `string | undefined`, not assignable to `{}` → fixed with `?? ''` fallback
- Build error: `.single()` return type resolves to `never` in middleware → fixed with explicit type assertion `as { data: ... | null }`

### Completion Notes List

- All 10 tasks completed, 10/10 subtasks done
- 31 new tests added (13 auth schemas + 18 middleware) → total suite: 145 passing, 0 failures
- Hub build passes clean (`next build` success, 7 static pages + 1 dynamic route)
- Same Supabase typed client workaround pattern as Story 1.3 (documented `as never` casts)
- Recovery codes generated server-side (10 codes, 8 chars each, alphanumeric). SHA-256 hashes stored in `mfa_metadata` JSONB.
- MFA setup is 3-step flow: loading → QR scan + verify → recovery codes display
- Brute force protection reuses existing `fn_check_login_attempts` / `fn_record_login_attempt` from Story 1.3
- `auth_user_id` auto-linked on first successful login if not yet set

### Change Log

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/00010_operators_auth_user_id.sql` | CREATED | Migration: auth_user_id UUID + mfa_metadata JSONB on operators |
| `supabase/config.toml` | MODIFIED | Enabled MFA TOTP (enroll + verify) |
| `packages/types/src/database.types.ts` | MODIFIED | Added auth_user_id, mfa_metadata to operators types |
| `apps/hub/package.json` | MODIFIED | Added react-hook-form, @hookform/resolvers, zod |
| `apps/hub/middleware.ts` | REPLACED | Full auth middleware (admin + AAL2 verification) |
| `apps/hub/app/(auth)/actions/auth.ts` | CREATED | 5 Server Actions + 2 Zod schemas |
| `apps/hub/app/(auth)/layout.tsx` | MODIFIED | Added bg-background p-4 styling |
| `apps/hub/app/(auth)/login/page.tsx` | REPLACED | Server Component with Card + Suspense |
| `apps/hub/app/(auth)/login/login-form.tsx` | CREATED | Client Component (RHF + Zod) |
| `apps/hub/app/(auth)/login/loading.tsx` | CREATED | Skeleton loader |
| `apps/hub/app/(auth)/login/verify-mfa/page.tsx` | CREATED | 2FA verification page |
| `apps/hub/app/(auth)/login/verify-mfa/mfa-form.tsx` | CREATED | MFA form (6-digit auto-submit) |
| `apps/hub/app/(auth)/login/verify-mfa/loading.tsx` | CREATED | Skeleton loader |
| `apps/hub/app/(auth)/setup-mfa/page.tsx` | CREATED | Initial 2FA setup page |
| `apps/hub/app/(auth)/setup-mfa/setup-mfa-form.tsx` | CREATED | 3-step setup form (QR + verify + recovery codes) |
| `apps/hub/app/(auth)/setup-mfa/loading.tsx` | CREATED | Skeleton loader |
| `apps/hub/app/(dashboard)/logout-button.tsx` | CREATED | Logout button (same pattern as client) |
| `apps/hub/app/(dashboard)/layout.tsx` | MODIFIED | Added LogoutButton in HubHeader |
| `apps/hub/app/(auth)/actions/auth.test.ts` | CREATED | 13 tests (schema validation) |
| `apps/hub/middleware.test.ts` | CREATED | 18 tests (routes + helpers) |

### File List

**Created (14 files):**
- `supabase/migrations/00010_operators_auth_user_id.sql`
- `apps/hub/app/(auth)/actions/auth.ts`
- `apps/hub/app/(auth)/actions/auth.test.ts`
- `apps/hub/app/(auth)/login/login-form.tsx`
- `apps/hub/app/(auth)/login/loading.tsx`
- `apps/hub/app/(auth)/login/verify-mfa/page.tsx`
- `apps/hub/app/(auth)/login/verify-mfa/mfa-form.tsx`
- `apps/hub/app/(auth)/login/verify-mfa/loading.tsx`
- `apps/hub/app/(auth)/setup-mfa/page.tsx`
- `apps/hub/app/(auth)/setup-mfa/setup-mfa-form.tsx`
- `apps/hub/app/(auth)/setup-mfa/loading.tsx`
- `apps/hub/app/(dashboard)/logout-button.tsx`
- `apps/hub/middleware.test.ts`

**Modified (8 files):**
- `supabase/config.toml`
- `packages/types/src/database.types.ts`
- `apps/hub/package.json`
- `package-lock.json`
- `apps/hub/middleware.ts`
- `apps/hub/app/(auth)/layout.tsx`
- `apps/hub/app/(auth)/login/page.tsx`
- `apps/hub/app/(dashboard)/layout.tsx`

## Senior Developer Review (AI)

**Reviewer:** Claude Opus 4.6 — 2026-02-11
**Verdict:** APPROVED after fixes

### Issues Found: 9 (3 HIGH, 4 MEDIUM, 2 LOW)

**HIGH — Fixed:**
- H1: Recovery codes SHA-256 hashes now stored in `mfa_metadata.recovery_codes_hashes` (was metadata-only, codes lost)
- H2: Middleware now redirects ALL public auth pages to dashboard when user is aal2 (was only `/login` exact)
- H3: Added `<Suspense>` wrappers on `verify-mfa/page.tsx` and `setup-mfa/page.tsx` (consistent pattern)

**MEDIUM — Fixed:**
- M1: Added `package-lock.json` to File List
- M2: Added centralized `as never` documentation comment at top of `auth.ts`
- M3: Removed dead `'verify'` step from `SetupStep` type union
- M4: Added TODO comment for JWT custom claims optimization on middleware DB queries

**LOW — Accepted (no fix needed):**
- L1: `key={i}` on static recovery codes list — acceptable for static render
- L2: Inconsistent French accents — deferred to Story 1.7 (design system) or i18n story 1.10

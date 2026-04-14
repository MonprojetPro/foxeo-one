# Onboarding Flow — MonprojetPro Lab

## Vue d'ensemble

L'onboarding se déclenche automatiquement à la **première connexion** d'un client Lab et guide l'utilisateur à travers les fonctionnalités principales via un tutoriel interactif.

## Champs DB (table `clients`)

| Colonne | Type | Default | Description |
|---------|------|---------|-------------|
| `onboarding_completed` | BOOLEAN | FALSE | Si TRUE, le client a terminé (ou passé) le tutoriel |
| `first_login_at` | TIMESTAMPTZ | NULL | Date/heure de la première connexion (NULL = jamais connecté) |

**Index :** `idx_clients_onboarding_completed` pour filtrage rapide.

**Migration :** `supabase/migrations/00035_add_onboarding_fields_clients.sql`

## Flux de première connexion

```
Login réussi
    ↓
Middleware détecte first_login_at IS NULL
    ↓
UPDATE clients SET first_login_at = NOW()
    ↓
Redirect → /onboarding/welcome
    ↓
Écran de bienvenue (full-screen, thème Lab)
    ↓
Clic "Commencer le tutoriel"
    ↓
/onboarding/tour → OnboardingTour component
    ↓
4 étapes de découverte (+ étape finale)
    ↓
Clic "Terminer" → completeOnboarding() Server Action
    ↓
UPDATE clients SET onboarding_completed = TRUE
    ↓
Redirect → /modules/parcours (si parcours assigné) ou /
```

## Flux de reconnexion (onboarding non terminé)

Si `first_login_at IS NOT NULL` mais `onboarding_completed = FALSE`, le middleware redirige vers `/onboarding/welcome` à chaque visite sur une route protégée.

## Relancer le tutoriel (AC6)

Depuis `/settings` → "Tutoriel interactif" → bouton "Revoir le tutoriel" :
- Supprime le flag localStorage `monprojetpro-onboarding-tour-completed`
- Redirige vers `/onboarding/tour`
- **Ne modifie PAS** `onboarding_completed` en DB (l'accès au dashboard reste débloqué)

## Routes

| Route | Type | Description |
|-------|------|-------------|
| `/onboarding/welcome` | Page (RSC) | Écran de bienvenue full-screen |
| `/onboarding/tour` | Page (RSC + Client) | Tutoriel interactif |
| `/onboarding/layout.tsx` | Layout | Sans dashboard shell |

## Composants

| Fichier | Description |
|---------|-------------|
| `app/components/onboarding/welcome-screen.tsx` | Écran de bienvenue (Client Component) |
| `app/components/onboarding/onboarding-tour.tsx` | Tutoriel interactif (Client Component) |
| `app/components/onboarding/restart-tour-button.tsx` | Bouton relancer le tour (Client Component) |
| `app/hooks/use-onboarding-tour.ts` | Hook de gestion d'état du tour |
| `app/onboarding/actions/complete-onboarding.ts` | Server Action finalisation |

## Middleware

`apps/client/middleware.ts` — détection automatique de première connexion :

```typescript
// Onboarding detection — only for non-onboarding paths
if (!isOnboardingExcluded(request.nextUrl.pathname)) {
  if (!client.first_login_at) {
    // First login: record timestamp + redirect to /onboarding/welcome
    await supabase.from('clients').update({ first_login_at: new Date().toISOString() }).eq('auth_user_id', user.id)
    return NextResponse.redirect('/onboarding/welcome')
  }
  if (!client.onboarding_completed) {
    return NextResponse.redirect('/onboarding/welcome')
  }
}
```

Les chemins exclus du check onboarding (via `isOnboardingExcluded()`) :
- `/onboarding/*` — évite les redirections en boucle
- `/login`, `/signup`, `/auth/callback` — routes publiques
- `/consent-update`, `/legal`, `/api`, `/suspended` — routes spéciales

## Anti-patterns

- Le tutoriel est **toujours skippable** (UX non-bloquante)
- L'état du tour est stocké en **localStorage uniquement** (pas en DB)
- La redirection se fait côté **serveur** (middleware) pour éviter le flash de contenu
- Après un délai raisonnable, la relance du tour ne touche **pas** `onboarding_completed`

## Logging

- `[ONBOARDING:FIRST_LOGIN]` — première connexion détectée
- `[ONBOARDING:COMPLETE]` — onboarding finalisé

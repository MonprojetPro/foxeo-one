# Graduation Flow — Lab vers One

## Vue d'ensemble

Le flux de graduation permet à un client Lab de transitionner vers MonprojetPro One avec une expérience célébratoire.

## Prérequis

- La graduation est déclenchée par MiKL via l'action `graduateClient()` (Story 9.1)
- La table `clients` doit avoir les colonnes : `graduated_at`, `graduation_screen_shown`, `graduation_message`

## Flux complet

```
MiKL déclenche graduation
    → clients.graduated_at = NOW()
    → (optionnel) clients.graduation_message = "Message personnalisé"
        ↓
Client se connecte
    → Middleware détecte graduated_at NOT NULL AND graduation_screen_shown = FALSE
    → Redirect vers /graduation/celebrate
        ↓
Page /graduation/celebrate
    → Animation confetti (canvas-confetti)
    → Transition thème Lab (violet) → One (vert/orange)
    → Affiche prénom + message MiKL + récapitulatif parcours
    → CTA : "Découvrir MonprojetPro One" → /graduation/discover-one
    → Skip : "Accéder directement" → appelle markGraduationScreenShown() + redirect /
        ↓
Page /graduation/discover-one
    → Présentation des modules One actifs (depuis client_configs.active_modules)
    → CTA : "Commencer le tutoriel" → /graduation/tour-one
    → CTA : "Accéder au dashboard" → /graduation/tour-one?skip=true
        ↓
Page /graduation/tour-one
    → Tutoriel interactif adapté aux modules One actifs
    → Skip disponible à tout moment
    → Fin du tutoriel : markGraduationScreenShown() + toast + redirect /
        ↓
Client accède au dashboard One
    → graduation_screen_shown = TRUE
    → Plus de redirect vers /graduation/*
```

## Middleware

Le middleware `apps/client/middleware.ts` ajoute une détection graduation après les checks d'onboarding :

```typescript
// Graduation detection — only for non-graduation paths
if (!isGraduationExcluded(request.nextUrl.pathname)) {
  if (client.graduated_at && !client.graduation_screen_shown) {
    // Redirect to /graduation/celebrate
  }
}
```

**Chemins exclus** (`GRADUATION_EXCLUDED_PATHS`) : `/graduation`, `/login`, `/signup`, `/auth/callback`, `/consent-update`, `/legal`, `/api`, `/suspended`, `/onboarding`

## Colonnes DB (`clients`)

| Colonne | Type | Description |
|---------|------|-------------|
| `graduated_at` | TIMESTAMPTZ | Date de graduation (null = pas encore gradué) |
| `graduation_screen_shown` | BOOLEAN DEFAULT FALSE | Flag pour n'afficher l'écran qu'une seule fois |
| `graduation_message` | TEXT | Message personnalisé de MiKL (optionnel) |

## Server Action

`markGraduationScreenShown()` met à jour `graduation_screen_shown = TRUE` pour l'utilisateur authentifié.

Retourne `{ data: { success: true }, error: null }` en cas de succès.

## Composants

| Composant | Chemin | Usage |
|-----------|--------|-------|
| `GraduationCelebrate` | `app/components/graduation/graduation-celebrate.tsx` | Client component pour la page célébration |
| `GraduationConfetti` | `app/components/graduation/graduation-confetti.tsx` | Animation confetti (canvas-confetti) |
| `GraduationRecap` | `app/components/graduation/graduation-recap.tsx` | Récapitulatif durée parcours |
| `OneModuleCard` | `app/components/graduation/one-module-card.tsx` | Card pour chaque module One |
| `GraduationTour` | `app/components/graduation/graduation-tour.tsx` | Tutoriel One interactif |
| `GraduationTourSkip` | `app/components/graduation/graduation-tour-skip.tsx` | Skip tutoriel + markShown + redirect |

## Hook

`useGraduationTour()` — Gestion de l'état du tutoriel One (dérivé de `useOnboardingTour`).

## Anti-patterns

- **Ne pas** afficher l'écran plus d'une fois (`graduation_screen_shown` protège)
- **Ne pas** bloquer l'accès si le client skip
- **Ne pas** oublier d'exclure `/graduation` de tous les autres checks middleware
- **Ne pas** stocker l'état graduation dans Zustand (c'est une donnée serveur → TanStack Query si besoin)
